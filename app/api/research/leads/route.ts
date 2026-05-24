import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/research/leads — returns the authenticated user's enriched leads,
// most recent first. Only returns leads that have been fully enriched via Lusha.
// De-duplicates by keeping only the most recently enriched record per person
// (matched on full_name + company_name).
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '200'), 200)
  const inList = url.searchParams.get('inList') === 'true'
  const listId = url.searchParams.get('listId')

  let query = supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)

  if (listId) {
    // Fetch leads belonging to a specific list via junction table
    const { data: listLeadRows } = await supabase
      .from('list_leads')
      .select('lead_id')
      .eq('list_id', listId)

    const leadIdsInList = (listLeadRows ?? []).map(r => r.lead_id)
    if (leadIdsInList.length === 0) {
      return NextResponse.json({ leads: [] })
    }
    query = query.in('id', leadIdsInList)
  } else if (inList) {
    // Legacy: get leads in ANY list for this user
    const { data: listLeadRows } = await supabase
      .from('list_leads')
      .select('lead_id')
      .in('list_id', (await supabase
        .from('lists')
        .select('id')
        .eq('user_id', user.id)
      ).data?.map(l => l.id) ?? [])

    const leadIdsInList = (listLeadRows ?? []).map(r => r.lead_id)
    if (leadIdsInList.length === 0) {
      return NextResponse.json({ leads: [] })
    }
    query = query.in('id', leadIdsInList)
  } else {
    // Original behavior: only enriched leads
    query = query.not('enriched_at', 'is', null)
  }

  const { data: leads, error } = await query
    .order('created_at', { ascending: false })
    .limit(500) // fetch more than needed so dedup still yields enough

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduplicate: keep the most recent enrichment per (full_name + company_name)
  const seen = new Map<string, boolean>()
  const deduped = (leads ?? []).filter(lead => {
    const key = `${(lead.full_name ?? '').toLowerCase().trim()}::${(lead.company_name ?? '').toLowerCase().trim()}`
    if (seen.has(key)) return false
    seen.set(key, true)
    return true
  }).slice(0, limit)

  return NextResponse.json({ leads: deduped })
}
