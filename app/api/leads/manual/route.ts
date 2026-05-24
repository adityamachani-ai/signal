import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/leads/manual — create a lead without Lusha enrichment (manual entry)
// Required: full_name, linkedin_url, company_name, job_title
// Optional: list_id, company_linkedin_url, email, phone_direct, phone_mobile,
//           city, country, company_domain
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const linkedin_url = typeof body.linkedin_url === 'string' ? body.linkedin_url.trim() : ''
  const company_name = typeof body.company_name === 'string' ? body.company_name.trim() : ''
  const job_title = typeof body.job_title === 'string' ? body.job_title.trim() : ''
  const company_linkedin_url = typeof body.company_linkedin_url === 'string' ? body.company_linkedin_url.trim() : ''
  const company_domain = typeof body.company_domain === 'string' ? body.company_domain.trim() : ''

  if (!full_name) return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
  if (!linkedin_url) return NextResponse.json({ error: 'linkedin_url is required' }, { status: 400 })
  if (!company_name) return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
  if (!job_title) return NextResponse.json({ error: 'job_title is required' }, { status: 400 })
  if (!company_linkedin_url) return NextResponse.json({ error: 'company_linkedin_url is required' }, { status: 400 })
  if (!company_domain) return NextResponse.json({ error: 'company_domain is required' }, { status: 400 })

  const list_id = typeof body.list_id === 'string' ? body.list_id : null

  // Dedup: same user + same linkedin_url → return the existing lead
  const { data: existing } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .eq('linkedin_url', linkedin_url)
    .maybeSingle()

  if (existing) {
    // Patch any fields that were missing on the original record
    const patch: Record<string, unknown> = {}
    if (!existing.company_domain && company_domain) patch.company_domain = company_domain
    if (!existing.company_linkedin_url && company_linkedin_url) patch.company_linkedin_url = company_linkedin_url
    if (!existing.job_title && job_title) patch.job_title = job_title
    let updatedLead = existing
    if (Object.keys(patch).length > 0) {
      const { data: patched } = await supabase
        .from('leads')
        .update(patch)
        .eq('id', existing.id)
        .select()
        .single()
      if (patched) updatedLead = patched
    }
    // Ensure it's linked to the requested list (idempotent upsert)
    if (list_id) {
      await supabase
        .from('list_leads')
        .upsert({ list_id, lead_id: existing.id }, { onConflict: 'list_id,lead_id' })
    }
    return NextResponse.json({ lead: updatedLead, existed: true })
  }

  // Insert the new lead
  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      user_id: user.id,
      full_name,
      linkedin_url,
      company_name,
      job_title,
      company_linkedin_url: company_linkedin_url || null,
      company_domain: company_domain || null,
      email: typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null,
      city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null,
      country: typeof body.country === 'string' && body.country.trim() ? body.country.trim() : null,
      enrichment_source: 'manual',
      in_list: list_id !== null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Link to list
  if (list_id && lead) {
    await supabase
      .from('list_leads')
      .insert({ list_id, lead_id: lead.id })
  }

  return NextResponse.json({ lead }, { status: 201 })
}
