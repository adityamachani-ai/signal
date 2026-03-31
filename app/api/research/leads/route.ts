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

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .not('enriched_at', 'is', null)
    .order('enriched_at', { ascending: false })
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
