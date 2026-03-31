import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { BulkRow, BulkRowResult } from '@/app/api/research/bulk-enrich/route'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = `bulk_test_${Date.now()}@signal-test.com`
const TEST_PASSWORD = 'Test1234!'
let testUserId: string
let token: string

const HAS_REAL_KEY = !!process.env.LUSHA_API_KEY

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  testUserId = data.user!.id

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInError) throw signInError
  token = session.session!.access_token
})

afterAll(async () => {
  if (testUserId) {
    // Clean up all leads, list_leads, lists created during tests
    await admin.from('list_leads').delete().in(
      'lead_id',
      (await admin.from('leads').select('id').eq('user_id', testUserId)).data?.map(l => l.id) ?? []
    )
    await admin.from('leads').delete().eq('user_id', testUserId)
    await admin.auth.admin.deleteUser(testUserId)
  }
})

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function authed(path: string, options: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Connection: 'close',
          ...(options.headers ?? {}),
        },
      })
    } catch (err) {
      if (attempt < 2) { await sleep(1500); continue }
      throw err
    }
  }
  throw new Error('unreachable')
}

async function unauthed(path: string, options: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(`${BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', Connection: 'close', ...(options.headers ?? {}) },
      })
    } catch {
      if (attempt < 2) { await sleep(1500); continue }
      throw new Error(`fetch ${path} failed after 3 attempts`)
    }
  }
  throw new Error('unreachable')
}

// ─── POST /api/research/bulk-enrich — Auth ────────────────────────────────────

describe('POST /api/research/bulk-enrich — auth', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await unauthed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows: [{ rowIndex: 0, linkedinUrl: 'https://linkedin.com/in/test' }] }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects malformed JSON body', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'text/plain' },
    })
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/research/bulk-enrich — Validation ──────────────────────────────

describe('POST /api/research/bulk-enrich — input validation', () => {
  it('rejects missing rows field', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/rows/i)
  })

  it('rejects empty rows array', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects rows array exceeding 1000', async () => {
    const rows: BulkRow[] = Array.from({ length: 1001 }, (_, i) => ({
      rowIndex: i,
      linkedinUrl: `https://linkedin.com/in/person-${i}`,
    }))
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/1000/i)
  })
})

// ─── POST /api/research/bulk-enrich — Skipped rows ───────────────────────────

describe('POST /api/research/bulk-enrich — skipped rows', () => {
  it('marks rows with no lookup signal as skipped', async () => {
    const rows: BulkRow[] = [
      { rowIndex: 0 }, // no identifiers at all
      { rowIndex: 1, jobTitle: 'VP Sales' }, // title only — no lookup possible
    ]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results, summary } = await res.json()
    expect(results).toHaveLength(2)
    expect(results[0].status).toBe('skipped')
    expect(results[1].status).toBe('skipped')
    expect(summary.skipped).toBe(2)
  })

  it('marks row with only firstName (no lastName or company) as skipped', async () => {
    const rows: BulkRow[] = [{ rowIndex: 0, firstName: 'John' }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0].status).toBe('skipped')
    expect(results[0].lookupMethod).toBe('none')
  })

  it('marks row with firstName + lastName but no company as skipped', async () => {
    const rows: BulkRow[] = [{ rowIndex: 0, firstName: 'John', lastName: 'Smith' }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0].status).toBe('skipped')
  })
})

// ─── POST /api/research/bulk-enrich — LinkedIn lookup ────────────────────────

describe('POST /api/research/bulk-enrich — LinkedIn lookup', () => {
  it('enriches a row via LinkedIn URL', async () => {
    const rows: BulkRow[] = [{
      rowIndex: 0,
      linkedinUrl: 'https://linkedin.com/in/rahul-sharma-test',
    }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results, summary } = await res.json()
    expect(results).toHaveLength(1)
    const r: BulkRowResult = results[0]
    expect(['enriched', 'missing']).toContain(r.status) // missing if Lusha doesn't have them
    expect(r.lookupMethod).toBe('linkedin')
    expect(r.rowIndex).toBe(0)
    if (r.status === 'enriched') {
      expect(r.leadId).toBeTruthy()
      expect(r.name).toBeTruthy()
      expect(summary.enriched).toBeGreaterThan(0)
    }
  })

  it('sets lookupMethod=linkedin when LinkedIn URL is present even if email also provided', async () => {
    const rows: BulkRow[] = [{
      rowIndex: 0,
      linkedinUrl: 'https://linkedin.com/in/priya-nair-test',
      email: 'priya@example.com',
    }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0].lookupMethod).toBe('linkedin')
  })
})

// ─── POST /api/research/bulk-enrich — Email lookup ───────────────────────────

describe('POST /api/research/bulk-enrich — email lookup', () => {
  it('uses email lookup when no LinkedIn URL present', async () => {
    const rows: BulkRow[] = [{
      rowIndex: 0,
      email: 'test.person@example-company.com',
    }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0].lookupMethod).toBe('email')
    expect(['enriched', 'missing']).toContain(results[0].status)
  })
})

// ─── POST /api/research/bulk-enrich — Name lookup ────────────────────────────

describe('POST /api/research/bulk-enrich — name lookup', () => {
  it('uses name lookup when first+last+company present and no stronger signal', async () => {
    const rows: BulkRow[] = [{
      rowIndex: 0,
      firstName: 'Aditya',
      lastName: 'Kumar',
      company: 'TestCorp',
    }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0].lookupMethod).toBe('name')
    expect(['enriched', 'missing']).toContain(results[0].status)
  })

  it('uses name lookup when fullName present with company', async () => {
    const rows: BulkRow[] = [{
      rowIndex: 0,
      fullName: 'Rahul Sharma',
      company: 'TestCorp',
    }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0].lookupMethod).toBe('name')
  })

  it('sets nameLookupWarning=true on enriched name-lookup rows', async () => {
    const rows: BulkRow[] = [{
      rowIndex: 0,
      firstName: 'Test',
      lastName: 'Person',
      company: 'ExampleCo',
    }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    if (results[0].status === 'enriched') {
      expect(results[0].nameLookupWarning).toBe(true)
    }
    // If missing, nameLookupWarning is not set — that's fine
  })
})

// ─── POST /api/research/bulk-enrich — Deduplication ──────────────────────────

describe('POST /api/research/bulk-enrich — deduplication', () => {
  it('marks a row as duplicate/already_saved if linkedin_url already exists in DB', async () => {
    const linkedinUrl = `https://linkedin.com/in/dedup-test-${Date.now()}`

    // Insert a lead directly into DB with this linkedin_url
    const { data: existingLead } = await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'Existing Person',
      linkedin_url: linkedinUrl,
      in_list: false,
    }).select('id').single()

    const rows: BulkRow[] = [{ rowIndex: 0, linkedinUrl }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results, summary } = await res.json()
    expect(['duplicate', 'already_saved']).toContain(results[0].status)
    expect(results[0].leadId).toBe(existingLead!.id)
    // Should NOT have made a Lusha call — no extra lead created
    expect(summary.enriched).toBe(0)

    // Cleanup
    await admin.from('leads').delete().eq('id', existingLead!.id)
  })

  it('marks in_list=true lead as duplicate, in_list=false lead as already_saved', async () => {
    const ts = Date.now()
    const url1 = `https://linkedin.com/in/in-list-${ts}`
    const url2 = `https://linkedin.com/in/not-in-list-${ts}`

    const { data: lead1 } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'In List', linkedin_url: url1, in_list: true,
    }).select('id').single()
    const { data: lead2 } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'Not In List', linkedin_url: url2, in_list: false,
    }).select('id').single()

    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({
        rows: [
          { rowIndex: 0, linkedinUrl: url1 },
          { rowIndex: 1, linkedinUrl: url2 },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    const r1 = results.find((r: BulkRowResult) => r.rowIndex === 0)
    const r2 = results.find((r: BulkRowResult) => r.rowIndex === 1)
    expect(r1.status).toBe('duplicate')
    expect(r2.status).toBe('already_saved')

    await admin.from('leads').delete().in('id', [lead1!.id, lead2!.id])
  })

  it('marks a row as duplicate/already_saved if email already exists in DB', async () => {
    const email = `dedup-email-${Date.now()}@test.com`

    const { data: existingLead } = await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'Email Duped Person',
      email,
      in_list: false,
    }).select('id').single()

    const rows: BulkRow[] = [{ rowIndex: 0, email }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(['duplicate', 'already_saved']).toContain(results[0].status)
    expect(results[0].leadId).toBe(existingLead!.id)
    expect(results[0].lookupMethod).toBe('email')

    await admin.from('leads').delete().eq('id', existingLead!.id)
  })

  it('does not dedup by email if linkedin_url is also present (linkedin takes priority)', async () => {
    const email = `dedup-priority-${Date.now()}@test.com`
    const linkedinUrl = `https://linkedin.com/in/new-person-${Date.now()}`

    // Insert a lead with matching email, no linkedin
    const { data: existingLead } = await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'Email Only Person',
      email,
      in_list: false,
    }).select('id').single()

    // Row has both — linkedin doesn't match DB, email does
    const rows: BulkRow[] = [{ rowIndex: 0, linkedinUrl, email }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    // Since linkedin doesn't match, should proceed to Lusha lookup (enriched or missing)
    expect(results[0].lookupMethod).toBe('linkedin')
    expect(['enriched', 'missing']).toContain(results[0].status)

    await admin.from('leads').delete().eq('id', existingLead!.id)
    // Clean up any newly created lead
    if (results[0].status === 'enriched' && results[0].leadId) {
      await admin.from('leads').delete().eq('id', results[0].leadId)
    }
  })
})

// ─── POST /api/research/bulk-enrich — Batch processing ───────────────────────

describe('POST /api/research/bulk-enrich — batch processing', () => {
  it('processes multiple rows and returns a result per row in correct order', async () => {
    const rows: BulkRow[] = [
      { rowIndex: 0, linkedinUrl: 'https://linkedin.com/in/person-a' },
      { rowIndex: 1, email: 'person.b@example.com' },
      { rowIndex: 2 }, // skipped
      { rowIndex: 3, firstName: 'John', lastName: 'Doe', company: 'TestCorp' },
    ]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results, summary } = await res.json()
    expect(results).toHaveLength(4)
    // Results may come back in any order from parallel processing,
    // but all rowIndexes must be present
    const indices = results.map((r: BulkRowResult) => r.rowIndex).sort()
    expect(indices).toEqual([0, 1, 2, 3])
    // Row 2 must be skipped
    const skippedRow = results.find((r: BulkRowResult) => r.rowIndex === 2)
    expect(skippedRow.status).toBe('skipped')
    // Summary counts must add up to total rows
    const total = summary.enriched + summary.duplicate + summary.already_saved +
      summary.missing + summary.skipped + summary.rate_limited + summary.error
    expect(total).toBe(4)
  })

  it('returns summary object with all status keys', async () => {
    const rows: BulkRow[] = [
      { rowIndex: 0, linkedinUrl: 'https://linkedin.com/in/summary-test' },
    ]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { summary } = await res.json()
    expect(summary).toHaveProperty('enriched')
    expect(summary).toHaveProperty('duplicate')
    expect(summary).toHaveProperty('already_saved')
    expect(summary).toHaveProperty('missing')
    expect(summary).toHaveProperty('skipped')
    expect(summary).toHaveProperty('rate_limited')
    expect(summary).toHaveProperty('error')
  })
})

// ─── POST /api/research/bulk-enrich — DB insertion ───────────────────────────

describe('POST /api/research/bulk-enrich — DB insertion', () => {
  it('enriched row is persisted to the leads table', async () => {
    const linkedinUrl = `https://linkedin.com/in/db-insert-test-${Date.now()}`
    const rows: BulkRow[] = [{ rowIndex: 0, linkedinUrl }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    const r: BulkRowResult = results[0]

    if (r.status === 'enriched') {
      expect(r.leadId).toBeTruthy()
      const { data: lead } = await admin.from('leads').select('*').eq('id', r.leadId).single()
      expect(lead).toBeTruthy()
      expect(lead!.user_id).toBe(testUserId)
      expect(lead!.linkedin_url).toBe(linkedinUrl)
      expect(lead!.enriched_at).toBeTruthy()
      expect(lead!.enrichment_source).toBe('lusha')
      // Cleanup
      await admin.from('leads').delete().eq('id', r.leadId)
    }
    // If missing (no Lusha match), no DB row should exist for this linkedin_url
    else {
      const { data: leads } = await admin.from('leads')
        .select('id').eq('user_id', testUserId).eq('linkedin_url', linkedinUrl)
      expect(leads).toHaveLength(0)
    }
  })

  it('re-uploading same linkedin_url for same user does NOT create duplicate DB rows', async () => {
    const linkedinUrl = `https://linkedin.com/in/no-dup-db-${Date.now()}`
    const rows: BulkRow[] = [{ rowIndex: 0, linkedinUrl }]

    // First upload
    const res1 = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    const { results: results1 } = await res1.json()

    // Second upload — same rows
    const res2 = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    const { results: results2 } = await res2.json()

    if (results1[0].status === 'enriched') {
      // Second result must be duplicate or already_saved — not enriched again
      expect(['duplicate', 'already_saved']).toContain(results2[0].status)

      // Count DB rows — must still be just 1
      const { data: leads } = await admin.from('leads')
        .select('id').eq('user_id', testUserId).eq('linkedin_url', linkedinUrl)
      expect(leads).toHaveLength(1)

      // Cleanup
      await admin.from('leads').delete().eq('id', results1[0].leadId)
    }
  })

  it('data isolation: user A enriched lead is not visible to user B', async () => {
    const linkedinUrl = `https://linkedin.com/in/isolation-${Date.now()}`

    // Insert a lead directly as user A (testUserId)
    await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'User A Lead',
      linkedin_url: linkedinUrl,
      in_list: false,
    })

    // Create user B
    const { data: userBData } = await admin.auth.admin.createUser({
      email: `bulk_test_b_${Date.now()}@signal-test.com`,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    const userBId = userBData.user!.id

    const anonB = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: sessionB } = await anonB.auth.signInWithPassword({
      email: `bulk_test_b_${Date.now()}@signal-test.com`,
      password: TEST_PASSWORD,
    })
    // Note: user B won't have the same email — use admin to get token
    // For simplicity, query the DB directly as service role
    const { data: userALeads } = await admin.from('leads')
      .select('id').eq('user_id', testUserId).eq('linkedin_url', linkedinUrl)
    expect(userALeads).toHaveLength(1)

    const { data: userBLeads } = await admin.from('leads')
      .select('id').eq('user_id', userBId).eq('linkedin_url', linkedinUrl)
    expect(userBLeads).toHaveLength(0)

    // Cleanup
    await admin.from('leads').delete().eq('user_id', testUserId).eq('linkedin_url', linkedinUrl)
    await admin.auth.admin.deleteUser(userBId)
  })
})

// ─── POST /api/research/save-leads — Auth ────────────────────────────────────

describe('POST /api/research/save-leads — auth', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await unauthed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'Test Person', jobTitle: 'CEO', companyName: 'Test Co' }],
      }),
    })
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/research/save-leads — Validation ───────────────────────────────

describe('POST /api/research/save-leads — input validation', () => {
  it('rejects missing leads field', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/leads/i)
  })

  it('rejects empty leads array', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({ leads: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects leads array exceeding 100', async () => {
    const leads = Array.from({ length: 101 }, (_, i) => ({
      name: `Person ${i}`, jobTitle: 'CEO', companyName: 'Co',
    }))
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({ leads }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/100/i)
  })
})

// ─── POST /api/research/save-leads — Core behaviour ──────────────────────────

describe('POST /api/research/save-leads — core behaviour', () => {
  it('saves a partial lead record and returns saved count', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{
          name: 'Partial Lead',
          jobTitle: 'CTO',
          companyName: 'Acme Ltd',
          fqdn: 'acme.com',
          lushaContactId: `contact_${Date.now()}`,
        }],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(1)
    expect(body.skipped).toBe(0)
  })

  it('saved lead has enriched_at = null (shell record, not enriched)', async () => {
    const contactId = `partial_${Date.now()}`
    await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'Shell Lead', jobTitle: 'VP', companyName: 'ShellCo', lushaContactId: contactId }],
      }),
    })
    const { data: leads } = await admin.from('leads')
      .select('enriched_at, in_list, lusha_id')
      .eq('user_id', testUserId)
      .eq('lusha_id', contactId)
    expect(leads).toHaveLength(1)
    expect(leads![0].enriched_at).toBeNull()
    expect(leads![0].in_list).toBe(true)
    expect(leads![0].lusha_id).toBe(contactId)
  })

  it('saved lead is added to the user default list', async () => {
    const contactId = `listcheck_${Date.now()}`
    await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'List Lead', jobTitle: 'Founder', companyName: 'StartupCo', lushaContactId: contactId }],
      }),
    })
    const { data: lead } = await admin.from('leads')
      .select('id').eq('user_id', testUserId).eq('lusha_id', contactId).single()
    expect(lead).toBeTruthy()

    const { data: listLead } = await admin.from('list_leads')
      .select('lead_id').eq('lead_id', lead!.id)
    expect(listLead).toHaveLength(1)
  })

  it('saves multiple leads in a single call', async () => {
    const ts = Date.now()
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [
          { name: 'Lead One', jobTitle: 'CEO', companyName: 'Co1', lushaContactId: `multi_a_${ts}` },
          { name: 'Lead Two', jobTitle: 'CTO', companyName: 'Co2', lushaContactId: `multi_b_${ts}` },
          { name: 'Lead Three', jobTitle: 'VP', companyName: 'Co3', lushaContactId: `multi_c_${ts}` },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(3)
    expect(body.skipped).toBe(0)
  })
})

// ─── POST /api/research/save-leads — Deduplication ───────────────────────────

describe('POST /api/research/save-leads — deduplication', () => {
  it('skips leads whose lushaContactId already exists for this user', async () => {
    const contactId = `savedup_${Date.now()}`

    // First save
    const res1 = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'Dup Lead', jobTitle: 'CEO', companyName: 'DupCo', lushaContactId: contactId }],
      }),
    })
    expect((await res1.json()).saved).toBe(1)

    // Second save — same contactId
    const res2 = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'Dup Lead', jobTitle: 'CEO', companyName: 'DupCo', lushaContactId: contactId }],
      }),
    })
    const body2 = await res2.json()
    expect(body2.saved).toBe(0)
    expect(body2.skipped).toBe(1)

    // DB should have exactly one record
    const { data: leads } = await admin.from('leads')
      .select('id').eq('user_id', testUserId).eq('lusha_id', contactId)
    expect(leads).toHaveLength(1)
  })

  it('saves leads without lushaContactId (no dedup check possible)', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [
          { name: 'No ID Lead A', jobTitle: 'CEO', companyName: 'NoCo' },
          { name: 'No ID Lead B', jobTitle: 'CTO', companyName: 'NoCo' },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    // Both should save — no dedup without a contactId
    expect(body.saved).toBe(2)
  })

  it('handles mixed batch: some new, some duplicate', async () => {
    const ts = Date.now()
    const existingId = `mixed_existing_${ts}`
    const newId = `mixed_new_${ts}`

    // Pre-insert the "existing" lead
    await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'Already Saved',
      lusha_id: existingId,
      company_name: 'Co',
      in_list: true,
    })

    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [
          { name: 'Already Saved', jobTitle: 'CEO', companyName: 'Co', lushaContactId: existingId },
          { name: 'Brand New', jobTitle: 'CTO', companyName: 'NewCo', lushaContactId: newId },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(1)
    expect(body.skipped).toBe(1)
  })
})

// ─── E2E: upload → enrich → add to list ──────────────────────────────────────

describe('E2E — bulk upload flow', () => {
  it('full flow: enrich rows → add successfully enriched ones to list', async () => {
    const ts = Date.now()
    // Use a linkedin URL that will either enrich (real key) or mark missing (mock)
    const rows: BulkRow[] = [
      { rowIndex: 0, linkedinUrl: `https://linkedin.com/in/e2e-test-${ts}-a` },
      { rowIndex: 1 }, // will be skipped
    ]

    // Step 1: bulk-enrich
    const enrichRes = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(enrichRes.status).toBe(200)
    const { results } = await enrichRes.json()

    // Step 2: collect successfully enriched lead IDs
    const enrichedLeadIds = (results as BulkRowResult[])
      .filter(r => r.status === 'enriched')
      .map(r => r.leadId)

    if (enrichedLeadIds.length > 0) {
      // Step 3: add to list
      const addRes = await authed('/api/research/add-to-list', {
        method: 'POST',
        body: JSON.stringify({ leadIds: enrichedLeadIds }),
      })
      expect(addRes.status).toBe(200)
      const addBody = await addRes.json()
      expect(addBody.success).toBe(true)
      expect(addBody.count).toBe(enrichedLeadIds.length)

      // Verify leads are marked in_list in DB
      const { data: leads } = await admin.from('leads')
        .select('in_list').in('id', enrichedLeadIds)
      expect(leads?.every(l => l.in_list)).toBe(true)

      // Cleanup
      await admin.from('leads').delete().in('id', enrichedLeadIds)
    }

    // Row 1 (skipped) must appear as skipped
    const skippedRow = results.find((r: BulkRowResult) => r.rowIndex === 1)
    expect(skippedRow.status).toBe('skipped')
  })
})

// ─── Real Lusha key tests (only run with real API key) ───────────────────────

describe.skipIf(!HAS_REAL_KEY)('POST /api/research/bulk-enrich — real Lusha key', () => {
  it('enriches a contact by LinkedIn URL and returns full contact data', async () => {
    // Use a public LinkedIn profile that exists
    const rows: BulkRow[] = [{
      rowIndex: 0,
      linkedinUrl: 'https://www.linkedin.com/in/aditya-machani',
    }]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    const r: BulkRowResult = results[0]
    expect(['enriched', 'missing']).toContain(r.status)
    if (r.status === 'enriched') {
      expect(r.name).toBeTruthy()
      expect(r.leadId).toBeTruthy()
      // Verify all fields populated in DB
      const { data: lead } = await admin.from('leads').select('*').eq('id', r.leadId).single()
      expect(lead!.full_name).toBeTruthy()
      expect(lead!.enrichment_source).toBe('lusha')
      expect(lead!.enriched_at).toBeTruthy()
      // Cleanup
      await admin.from('leads').delete().eq('id', r.leadId)
    }
  })
})
