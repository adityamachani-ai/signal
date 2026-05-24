import { NextRequest, NextResponse } from 'next/server'
import { lookupContact, LushaApiError } from '@/lib/lusha'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulkRow {
  rowIndex: number
  linkedinUrl?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  company?: string
  jobTitle?: string // display-only from CSV, overridden by Lusha if found
}

export type RowStatus = 'enriched' | 'duplicate' | 'already_saved' | 'missing' | 'skipped' | 'rate_limited' | 'error'

export interface BulkRowResult {
  rowIndex: number
  status: RowStatus
  leadId: string
  name: string
  jobTitle: string
  company: string
  email: string
  phone: string
  location: string
  hasPhone: boolean
  lookupMethod: 'linkedin' | 'email' | 'name' | 'none'
  nameLookupWarning?: boolean // name+company is fuzzy
  companyDomain?: string
}

const BATCH_SIZE = 5
const BATCH_DELAY_MS = 150

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') ?? '',
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  let rows: BulkRow[]
  try {
    const body = await request.json()
    rows = body.rows
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows is required and must be a non-empty array' }, { status: 400 })
  }

  if (rows.length > 1000) {
    return NextResponse.json({ error: 'Maximum 1000 rows per upload' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Step 1: Bulk dedup check for rows that have linkedin_url or email ──────
  // One query each — cheaper than N individual queries

  const linkedinUrls = rows
    .map(r => r.linkedinUrl?.trim())
    .filter((u): u is string => !!u)

  const emails = rows
    .map(r => r.email?.trim())
    .filter((e): e is string => !!e)

  const [existingByLinkedin, existingByEmail] = await Promise.all([
    linkedinUrls.length > 0
      ? supabase
          .from('leads')
          .select('id, linkedin_url, in_list')
          .eq('user_id', user.id)
          .in('linkedin_url', linkedinUrls)
      : Promise.resolve({ data: [] as { id: string; linkedin_url: string; in_list: boolean }[] }),
    emails.length > 0
      ? supabase
          .from('leads')
          .select('id, email, in_list')
          .eq('user_id', user.id)
          .in('email', emails)
      : Promise.resolve({ data: [] as { id: string; email: string; in_list: boolean }[] }),
  ])

  // Build lookup maps
  const linkedinMap = new Map<string, { id: string; in_list: boolean }>()
  for (const row of existingByLinkedin.data ?? []) {
    if (row.linkedin_url) linkedinMap.set(row.linkedin_url.toLowerCase(), { id: row.id, in_list: row.in_list })
  }

  const emailMap = new Map<string, { id: string; in_list: boolean }>()
  for (const row of existingByEmail.data ?? []) {
    if (row.email) emailMap.set(row.email.toLowerCase(), { id: row.id, in_list: row.in_list })
  }

  // ── Step 2: Process rows in batches ──────────────────────────────────────

  const results: BulkRowResult[] = []

  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE)

    type LushaResult = { kind: 'resolved'; result: BulkRowResult } | { kind: 'enriched'; row: BulkRow; contact: Awaited<ReturnType<typeof lookupContact>>; lookupMethod: BulkRowResult['lookupMethod']; linkedin?: string }

    const batchResults: LushaResult[] = await Promise.all(batch.map(async (row): Promise<LushaResult> => {
      const linkedin = row.linkedinUrl?.trim()
      const email = row.email?.trim()
      const firstName = row.firstName?.trim() || (row.fullName ? splitFullName(row.fullName).firstName : '')
      const lastName = row.lastName?.trim() || (row.fullName ? splitFullName(row.fullName).lastName : '')
      const company = row.company?.trim() || ''
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || row.fullName?.trim() || 'Unknown'

      // ── Check existing DB records for linkedin/email ──────────────────────
      if (linkedin) {
        const existing = linkedinMap.get(linkedin.toLowerCase())
        if (existing) {
          return { kind: 'resolved', result: {
            rowIndex: row.rowIndex, status: existing.in_list ? 'duplicate' : 'already_saved',
            leadId: existing.id, name: displayName, jobTitle: row.jobTitle ?? '', company,
            email: email ?? '', phone: '', location: '', hasPhone: false, lookupMethod: 'linkedin',
          }}
        }
      }

      if (email && !linkedin) {
        const existing = emailMap.get(email.toLowerCase())
        if (existing) {
          return { kind: 'resolved', result: {
            rowIndex: row.rowIndex, status: existing.in_list ? 'duplicate' : 'already_saved',
            leadId: existing.id, name: displayName, jobTitle: row.jobTitle ?? '', company,
            email, phone: '', location: '', hasPhone: false, lookupMethod: 'email',
          }}
        }
      }

      // ── Determine lookup method ────────────────────────────────────────────
      let lookupMethod: BulkRowResult['lookupMethod'] = 'none'
      if (linkedin) lookupMethod = 'linkedin'
      else if (email) lookupMethod = 'email'
      else if (firstName && lastName && company) lookupMethod = 'name'

      if (lookupMethod === 'none') {
        return { kind: 'resolved', result: {
          rowIndex: row.rowIndex, status: 'skipped', leadId: '', name: displayName,
          jobTitle: row.jobTitle ?? '', company, email: '', phone: '', location: '',
          hasPhone: false, lookupMethod: 'none',
        }}
      }

      // ── Call Lusha ─────────────────────────────────────────────────────────
      try {
        let contact
        if (lookupMethod === 'linkedin') {
          contact = await lookupContact({ type: 'linkedin', linkedinUrl: linkedin! })
        } else if (lookupMethod === 'email') {
          contact = await lookupContact({ type: 'email', email: email! })
        } else {
          contact = await lookupContact({ type: 'name', firstName, lastName, company })
        }

        if (!contact) {
          return { kind: 'resolved', result: {
            rowIndex: row.rowIndex, status: 'missing', leadId: '', name: displayName,
            jobTitle: row.jobTitle ?? '', company, email: email ?? '', phone: '', location: '',
            hasPhone: false, lookupMethod,
          }}
        }

        return { kind: 'enriched', row, contact, lookupMethod, linkedin }
      } catch (err) {
        const status: RowStatus = (err instanceof LushaApiError && err.code === 'RATE_LIMIT') ? 'rate_limited' : 'error'
        return { kind: 'resolved', result: {
          rowIndex: row.rowIndex, status, leadId: '', name: displayName,
          jobTitle: row.jobTitle ?? '', company, email: email ?? '', phone: '', location: '',
          hasPhone: false, lookupMethod,
        }}
      }
    }))

    // ── Batch lusha_id dedup: one query for all new lusha_ids ──────────────
    const enriched = batchResults.filter((r): r is Extract<LushaResult, { kind: 'enriched' }> => r.kind === 'enriched')
    const lushaIdCandidates = enriched.map(r => r.contact?.lushaId).filter((id): id is string => !!id)

    const lushaIdMap = new Map<string, { id: string; in_list: boolean }>()
    if (lushaIdCandidates.length > 0) {
      const { data: existingByLusha } = await supabase
        .from('leads')
        .select('id, lusha_id, in_list')
        .eq('user_id', user.id)
        .in('lusha_id', lushaIdCandidates)

      for (const lead of existingByLusha ?? []) {
        if (lead.lusha_id) lushaIdMap.set(lead.lusha_id, { id: lead.id, in_list: lead.in_list })
      }
    }

    // ── Process results: push resolved, dedup + insert enriched ────────────
    for (const item of batchResults) {
      if (item.kind === 'resolved') {
        results.push(item.result)
        continue
      }

      const { row, contact, lookupMethod, linkedin } = item

      // Check batched lusha_id dedup
      if (contact?.lushaId && lushaIdMap.has(contact.lushaId)) {
        const existing = lushaIdMap.get(contact.lushaId)!
        results.push({
          rowIndex: row.rowIndex,
          status: existing.in_list ? 'duplicate' : 'already_saved',
          leadId: existing.id,
          name: contact.fullName,
          jobTitle: contact.jobTitle,
          company: contact.companyName,
          email: contact.emails[0] ?? '',
          phone: contact.phones[0] ?? '',
          location: [contact.city, contact.country].filter(Boolean).join(', '),
          hasPhone: contact.phones.length > 0,
          lookupMethod,
          companyDomain: contact.companyDomain || undefined,
        })
        continue
      }

      if (!contact) continue

      // ── Insert new lead ──────────────────────────────────────────────────
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          lusha_id: contact.lushaId || null,
          full_name: contact.fullName,
          first_name: contact.firstName,
          last_name: contact.lastName,
          job_title: contact.jobTitle,
          seniority: contact.seniority,
          department: contact.department,
          linkedin_url: contact.linkedinUrl || linkedin || null,
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
        })
        .select('id')
        .single()

      if (insertError || !newLead) {
        results.push({
          rowIndex: row.rowIndex, status: 'error', leadId: '',
          name: contact.fullName, jobTitle: contact.jobTitle, company: contact.companyName,
          email: contact.emails[0] ?? '', phone: contact.phones[0] ?? '',
          location: [contact.city, contact.country].filter(Boolean).join(', '),
          hasPhone: contact.phones.length > 0, lookupMethod,
          companyDomain: contact.companyDomain || undefined,
        })
        continue
      }

      results.push({
        rowIndex: row.rowIndex, status: 'enriched', leadId: newLead.id,
        name: contact.fullName, jobTitle: contact.jobTitle, company: contact.companyName,
        email: contact.emails[0] ?? '', phone: contact.phones[0] ?? '',
        location: [contact.city, contact.country].filter(Boolean).join(', '),
        hasPhone: contact.phones.length > 0, lookupMethod,
        nameLookupWarning: lookupMethod === 'name',
        companyDomain: contact.companyDomain || undefined,
      })
    }

    // Throttle between batches to respect Lusha rate limits
    if (batchStart + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  // ── Summary counts ─────────────────────────────────────────────────────────
  const summary = {
    enriched: results.filter(r => r.status === 'enriched').length,
    duplicate: results.filter(r => r.status === 'duplicate').length,
    already_saved: results.filter(r => r.status === 'already_saved').length,
    missing: results.filter(r => r.status === 'missing').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    rate_limited: results.filter(r => r.status === 'rate_limited').length,
    error: results.filter(r => r.status === 'error').length,
  }

  return NextResponse.json({ results, summary })
}
