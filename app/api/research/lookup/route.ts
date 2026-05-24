import { NextRequest, NextResponse } from 'next/server'
import { lookupContact, LookupInput, LushaApiError } from '@/lib/lusha'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const CACHE_MAX_AGE_DAYS = 30

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let body: LookupInput & { force?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.type || !['linkedin', 'email', 'name'].includes(body.type)) {
    return NextResponse.json({ error: 'Missing or invalid input type' }, { status: 400 })
  }

  const force = body.force === true
  const freshAfter = new Date(Date.now() - CACHE_MAX_AGE_DAYS * 86400000).toISOString()

  // ── Dedup: check DB before spending a Lusha credit ─────────────────────────
  // Skip cache when force=true; also treat leads older than CACHE_MAX_AGE_DAYS as stale
  if (!force) {
    let existing = null
    if (body.type === 'linkedin') {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('linkedin_url', body.linkedinUrl)
        .not('enriched_at', 'is', null)
        .gte('enriched_at', freshAfter)
        .maybeSingle()
      existing = data
    } else if (body.type === 'email') {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('email', body.email)
        .not('enriched_at', 'is', null)
        .gte('enriched_at', freshAfter)
        .maybeSingle()
      existing = data
    }
    if (existing) {
      return NextResponse.json({ lead: existing, cached: true })
    }

    // Dedup: name + company
    if (body.type === 'name') {
      const { data: existingByName } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_name', body.company)
        .ilike('full_name', `${body.firstName}%${body.lastName || ''}%`)
        .not('enriched_at', 'is', null)
        .gte('enriched_at', freshAfter)
        .limit(1)
        .maybeSingle()
      if (existingByName) {
        return NextResponse.json({ lead: existingByName, cached: true })
      }
    }
  }

  let contact
  try {
    contact = await lookupContact(body)
  } catch (err) {
    if (err instanceof LushaApiError) {
      const status = err.code === 'RATE_LIMIT' ? 429 : 422
      return NextResponse.json({ error: err.message }, { status })
    }
    throw err
  }
  if (!contact) {
    return NextResponse.json({ error: 'No contact found for that input' }, { status: 404 })
  }

  // Check if this lead already exists so we can update instead of duplicate
  let existingId: string | null = null

  // Try by lusha_id first
  if (contact.lushaId) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lusha_id', contact.lushaId)
      .limit(1)
      .maybeSingle()
    existingId = data?.id ?? null
  }

  // Fall back to linkedin URL match
  if (!existingId && contact.linkedinUrl) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('linkedin_url', contact.linkedinUrl)
      .limit(1)
      .maybeSingle()
    existingId = data?.id ?? null
  }

  // Fall back to name + company match
  if (!existingId && contact.fullName && contact.companyName) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('full_name', contact.fullName)
      .eq('company_name', contact.companyName)
      .limit(1)
      .maybeSingle()
    existingId = data?.id ?? null
  }

  const leadData = {
    user_id: user.id,
    lusha_id: contact.lushaId,
    full_name: contact.fullName,
    first_name: contact.firstName,
    last_name: contact.lastName,
    job_title: contact.jobTitle,
    seniority: contact.seniority,
    department: contact.department,
    linkedin_url: contact.linkedinUrl,
    email: contact.emails[0] ?? null,
    phone_direct: contact.phones[0] ?? null,
    phone_mobile: contact.phones[1] ?? null,
    company_name: contact.companyName,
    company_domain: contact.companyDomain,
    company_size_range: contact.companySizeRange,
    company_industry: contact.companyIndustry,
    company_location: contact.companyLocation,
    city: contact.city,
    country: contact.country,
    enrichment_source: 'lusha',
    enrichment_raw: contact.rawPayload,
    enriched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let lead
  let error

  if (existingId) {
    // Update existing lead with fresh data
    const result = await supabase
      .from('leads')
      .update(leadData)
      .eq('id', existingId)
      .select()
      .single()
    lead = result.data
    error = result.error
  } else {
    const result = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single()
    lead = result.data
    error = result.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lead, refreshed: !!existingId })
}
