import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// Saves partial lead records and enriches them via Lusha person lookup.
// Used by ICP Discovery "Add to My List".

export interface PartialLead {
  name: string
  jobTitle: string
  companyName: string
  fqdn?: string
  logoUrl?: string
  lushaContactId?: string
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  let leads: PartialLead[]
  let listId: string | undefined
  try {
    const body = await request.json()
    leads = body.leads
    listId = body.listId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'leads is required and must be a non-empty array' }, { status: 400 })
  }

  if (leads.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 leads per save' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check for existing leads by lusha_id to avoid duplicates
  const lushaIds = leads
    .map(l => l.lushaContactId)
    .filter((id): id is string => !!id)

  const existingIds = new Set<string>()
  if (lushaIds.length > 0) {
    const { data: existing } = await supabase
      .from('leads')
      .select('lusha_id')
      .eq('user_id', user.id)
      .in('lusha_id', lushaIds)
    for (const row of existing ?? []) {
      if (row.lusha_id) existingIds.add(row.lusha_id)
    }
  }

  // Get target list
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
    // Fallback: get user's default list
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

  // Insert only new leads (skip already-saved ones)
  const toInsert = leads.filter(l => !l.lushaContactId || !existingIds.has(l.lushaContactId))

  if (toInsert.length === 0) {
    return NextResponse.json({ saved: 0, skipped: leads.length })
  }

  // ─── Save leads as shells (no re-enrichment) ──────────────────────────────
  // ICP search already found these contacts — we save the shell data now.
  // Full enrichment (email/phone reveal) happens when the user generates a brief.
  // This avoids burning additional Lusha credits on save.

  const rows = toInsert.map(lead => {
    const nameParts = lead.name.trim().split(/\s+/)
    return {
      user_id: user.id,
      full_name: lead.name,
      first_name: nameParts[0] ?? null,
      last_name: nameParts.slice(1).join(' ') || null,
      job_title: lead.jobTitle,
      company_name: lead.companyName,
      company_domain: lead.fqdn ?? null,
      lusha_id: lead.lushaContactId ?? null,
      enrichment_source: 'lusha' as const,
    }
  })

  const { data: inserted, error: insertError } = await supabase
    .from('leads')
    .insert(rows)
    .select('id')

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const newLeadIds = (inserted ?? []).map(r => r.id)

  // Add to the user's default list and mark as in_list
  if (newLeadIds.length > 0) {
    await supabase
      .from('list_leads')
      .upsert(
        newLeadIds.map(leadId => ({ list_id: targetListId, lead_id: leadId })),
        { onConflict: 'list_id,lead_id' }
      )

    await supabase
      .from('leads')
      .update({ in_list: true })
      .in('id', newLeadIds)
      .eq('user_id', user.id)
  }

  return NextResponse.json({
    saved: newLeadIds.length,
    skipped: leads.length - toInsert.length,
  })
}
