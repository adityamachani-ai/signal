import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const MAX_BULK = 500

// POST /api/lists/[id]/leads — add leads to a list (up to 500)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const { id: listId } = await params
  const supabase = createServiceClient()

  let leadIds: string[]
  try {
    const body = await request.json()
    leadIds = body.leadIds
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })
  }

  if (leadIds.length > MAX_BULK) {
    return NextResponse.json({ error: `Maximum ${MAX_BULK} leads per request` }, { status: 400 })
  }

  // Verify list ownership
  const { data: list } = await supabase
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // Upsert into list_leads — duplicates silently ignored
  const { error: insertError } = await supabase
    .from('list_leads')
    .upsert(
      leadIds.map(leadId => ({ list_id: listId, lead_id: leadId })),
      { onConflict: 'list_id,lead_id' }
    )

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Update the list's updated_at timestamp (ignore if column doesn't exist)
  await supabase
    .from('lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', listId)
    .then(() => {}) // ignore errors from missing column

  return NextResponse.json({ success: true, count: leadIds.length })
}

// DELETE /api/lists/[id]/leads — remove leads from a list (up to 500)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const { id: listId } = await params
  const supabase = createServiceClient()

  let leadIds: string[]
  try {
    const body = await request.json()
    leadIds = body.leadIds
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })
  }

  if (leadIds.length > MAX_BULK) {
    return NextResponse.json({ error: `Maximum ${MAX_BULK} leads per request` }, { status: 400 })
  }

  // Verify list ownership
  const { data: list } = await supabase
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // Remove from junction table
  const { error: deleteError } = await supabase
    .from('list_leads')
    .delete()
    .eq('list_id', listId)
    .in('lead_id', leadIds)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: leadIds.length })
}
