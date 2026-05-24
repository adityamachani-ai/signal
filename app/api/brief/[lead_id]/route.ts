import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const { lead_id } = await params
  const db = createServiceClient()

  // Fetch lead (verify ownership)
  const { data: lead, error: leadErr } = await db
    .from('leads')
    .select('id, full_name, job_title, company_name, company_domain, linkedin_url, company_linkedin_url, email, phone_direct, phone_mobile, city, country, brief_generated, brief_status, brief_generation_started_at, brief_generated_at')
    .eq('id', lead_id)
    .eq('user_id', user!.id)
    .single()

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Fetch brief if it exists
  const { data: brief } = await db
    .from('briefs')
    .select('id, who_they_are, pain_map, angle, why_now, outreach_drafts, outreach_context, generated_at, generation_sources')
    .eq('lead_id', lead_id)
    .eq('user_id', user!.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ lead, brief: brief ?? null })
}
