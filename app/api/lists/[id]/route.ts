import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH /api/lists/[id] — rename or update a list
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServiceClient()

  let updates: Record<string, unknown>
  try {
    const body = await request.json()
    updates = {}
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      if (name.length > 100) return NextResponse.json({ error: 'Name must be 100 chars or fewer' }, { status: 400 })
      updates.name = name
    }
    if (typeof body.color === 'string') updates.color = body.color.trim() || null
    if (typeof body.description === 'string') updates.description = body.description.trim() || null
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  // Verify ownership
  const { data: existing } = await supabase
    .from('lists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  updates.updated_at = new Date().toISOString()

  let { data: list, error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, created_at')
    .single()

  // If updated_at/color/description column doesn't exist, retry without them
  if (error?.message?.includes('does not exist') || error?.message?.includes('schema cache')) {
    const safeUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) safeUpdates.name = updates.name
    const retry = await supabase
      .from('lists')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, name, created_at')
      .single()
    list = retry.data
    error = retry.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ list })
}

// DELETE /api/lists/[id] — delete a list (leads remain, only list_leads junction removed)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServiceClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('lists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // list_leads rows cascade-delete with the list
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
