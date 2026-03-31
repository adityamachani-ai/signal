import { NextRequest, NextResponse } from 'next/server'
import { lookupContact, LookupInput, LushaApiError } from '@/lib/lusha'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { computeSignalScore } from '@/lib/signal-score'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let body: LookupInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.type || !['linkedin', 'email', 'name'].includes(body.type)) {
    return NextResponse.json({ error: 'Missing or invalid input type' }, { status: 400 })
  }

  // ── Dedup: check DB before spending a Lusha credit ─────────────────────────
  {
    let existing = null
    if (body.type === 'linkedin') {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('linkedin_url', body.linkedinUrl)
        .not('enriched_at', 'is', null)
        .maybeSingle()
      existing = data
    } else if (body.type === 'email') {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('email', body.email)
        .not('enriched_at', 'is', null)
        .maybeSingle()
      existing = data
    }
    if (existing) {
      return NextResponse.json({ lead: existing, cached: true })
    }
  }

  // Dedup: name + company (fuzzy — check for exact full_name + company_name match)
  if (body.type === 'name') {
    const { data: existingByName } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('company_name', body.company)
      .ilike('full_name', `${body.firstName}%${body.lastName || ''}%`)
      .not('enriched_at', 'is', null)
      .limit(1)
      .maybeSingle()
    if (existingByName) {
      return NextResponse.json({ lead: existingByName, cached: true })
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

  const { score, reasons } = computeSignalScore(contact)

  // Post-Lusha dedup: check if this lushaId already exists for this user
  if (contact.lushaId) {
    const { data: existingByLusha } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('lusha_id', contact.lushaId)
      .not('enriched_at', 'is', null)
      .limit(1)
      .maybeSingle()
    if (existingByLusha) {
      return NextResponse.json({ lead: existingByLusha, cached: true })
    }
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
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
      signal_score: score,
      signal_reasons: reasons,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lead })
}
