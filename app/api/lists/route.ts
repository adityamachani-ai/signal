import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/lists — returns all lists for the authenticated user with lead counts
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  // Try selecting with new columns, fall back to base columns if migration hasn't run
  let lists: Record<string, unknown>[] | null = null
  let error: { message: string } | null = null

  const fullResult = await supabase
    .from('lists')
    .select('id, name, color, description, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (fullResult.error?.message?.includes('does not exist') || fullResult.error?.message?.includes('schema cache')) {
    // Columns not yet added — select only base columns
    const fallback = await supabase
      .from('lists')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    lists = (fallback.data ?? []).map(l => ({ ...l, color: null, description: null, updated_at: null }))
    error = fallback.error
  } else {
    lists = fullResult.data
    error = fullResult.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get lead counts per list in one query
  const listIds = (lists ?? []).map(l => l.id as string)
  let countMap: Record<string, number> = {}

  if (listIds.length > 0) {
    const { data: counts } = await supabase
      .from('list_leads')
      .select('list_id')
      .in('list_id', listIds)

    countMap = (counts ?? []).reduce((acc, row) => {
      acc[row.list_id] = (acc[row.list_id] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const result = (lists ?? []).map(list => ({
    ...list,
    lead_count: countMap[list.id as string] ?? 0,
  }))

  return NextResponse.json({ lists: result })
}

// POST /api/lists — create a new list
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let name: string
  let color: string | undefined
  let description: string | undefined
  try {
    const body = await request.json()
    name = body.name?.trim()
    color = body.color?.trim() || undefined
    description = body.description?.trim() || undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!name || name.length === 0) {
    return NextResponse.json({ error: 'List name is required' }, { status: 400 })
  }

  if (name.length > 100) {
    return NextResponse.json({ error: 'List name must be 100 characters or fewer' }, { status: 400 })
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    name,
  }
  if (color) insertData.color = color
  if (description) insertData.description = description

  let { data: list, error: insertError } = await supabase
    .from('lists')
    .insert(insertData)
    .select('id, name, created_at')
    .single()

  // If color/description columns don't exist, retry with just name
  if (insertError?.message?.includes('does not exist') || insertError?.message?.includes('schema cache')) {
    const retry = await supabase
      .from('lists')
      .insert({ user_id: user.id, name })
      .select('id, name, created_at')
      .single()
    list = retry.data
    insertError = retry.error
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ list: { ...list, lead_count: 0 } }, { status: 201 })
}
