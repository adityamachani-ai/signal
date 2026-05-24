import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let leadIds: string[]
  let listId: string | undefined
  try {
    const body = await request.json()
    leadIds = body.leadIds
    listId = body.listId  // optional — if omitted, uses the user's default list
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })
  }

  let targetListId: string

  if (listId) {
    // Verify the list belongs to this user
    const { data: list } = await supabase
      .from('lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }
    targetListId = list.id
  } else {
    // Fallback: get the user's default list (oldest created)
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'No list found for this user' }, { status: 404 })
    }
    targetListId = list.id
  }

  // Insert into list_leads — upsert so duplicates are silently ignored
  const { error: insertError } = await supabase
    .from('list_leads')
    .upsert(
      leadIds.map(leadId => ({ list_id: targetListId, lead_id: leadId })),
      { onConflict: 'list_id,lead_id' }
    )

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Mark leads as in_list
  await supabase
    .from('leads')
    .update({ in_list: true })
    .in('id', leadIds)
    .eq('user_id', user.id)

  // Update list's updated_at (ignore if column doesn't exist)
  await supabase
    .from('lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', targetListId)
    .then(() => {})

  return NextResponse.json({ success: true, count: leadIds.length, listId: targetListId })
}

export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let leadIds: string[]
  let listId: string | undefined
  try {
    const body = await request.json()
    leadIds = body.leadIds
    listId = body.listId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })
  }

  let targetListId: string

  if (listId) {
    const { data: list } = await supabase
      .from('lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }
    targetListId = list.id
  } else {
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'No list found' }, { status: 404 })
    }
    targetListId = list.id
  }

  // Remove from list_leads junction table
  await supabase
    .from('list_leads')
    .delete()
    .eq('list_id', targetListId)
    .in('lead_id', leadIds)

  return NextResponse.json({ success: true, count: leadIds.length })
}
