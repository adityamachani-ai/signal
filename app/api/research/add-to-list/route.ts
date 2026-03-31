import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

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

  // Get the user's default list (oldest created = their "My List")
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

  // Insert into list_leads — upsert so duplicates are silently ignored
  const { error: insertError } = await supabase
    .from('list_leads')
    .upsert(
      leadIds.map(leadId => ({ list_id: list.id, lead_id: leadId })),
      { onConflict: 'list_id,lead_id' }
    )

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Mark leads as in_list — scoped to this user so RLS is respected
  await supabase
    .from('leads')
    .update({ in_list: true })
    .in('id', leadIds)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true, count: leadIds.length })
}
