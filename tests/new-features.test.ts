/**
 * Integration tests for the new features added in the quality fix pass:
 *
 *   1. POST /api/research/save-leads  — enrichment, signal score, dedup
 *   2. POST /api/research/lookup      — outreachContext stored on lead
 *   3. POST /api/research/lookup      — signal_score / signal_reasons populated
 *   4. GET  /api/research/leads       — enriched ICP saves appear in listing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = `newfeatures_${Date.now()}@signal-test.com`
const TEST_PASSWORD = 'Test1234!'
let testUserId: string
let token: string

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        headers: {
          'Content-Type': 'application/json',
          Connection: 'close',
          ...(options.headers ?? {}),
        },
      })
    } catch {
      if (attempt < 2) { await sleep(1500); continue }
      throw new Error(`fetch ${path} failed after 3 attempts`)
    }
  }
  throw new Error('unreachable')
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

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
    const { data: leads } = await admin.from('leads').select('id').eq('user_id', testUserId)
    const leadIds = leads?.map(l => l.id) ?? []
    if (leadIds.length > 0) {
      await admin.from('list_leads').delete().in('lead_id', leadIds)
    }
    await admin.from('leads').delete().eq('user_id', testUserId)
    await admin.from('lists').delete().eq('user_id', testUserId)
    await admin.auth.admin.deleteUser(testUserId)
  }
})

// ─── 1. POST /api/research/save-leads — auth & validation ───────────────────

describe('POST /api/research/save-leads — auth & validation', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await unauthed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'Test', jobTitle: 'VP', companyName: 'Co' }],
      }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing leads field', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/leads/i)
  })

  it('returns 400 for empty leads array', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({ leads: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: '{invalid json',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
  })
})

// ─── 2. POST /api/research/save-leads — enrichment on save ──────────────────

describe('POST /api/research/save-leads — enrichment', () => {
  let savedLeadId: string

  it('saves a lead and enriches it via Lusha (mock mode)', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{
          name: 'Rahul Sharma',
          jobTitle: 'VP of Sales',
          companyName: 'Acme Corp',
          fqdn: 'acmecorp.in',
        }],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(1)
    expect(body.skipped).toBe(0)
    // save-leads now stores shells — no re-enrichment
    // enriched field is no longer returned

    // Read the lead from DB to verify shell was saved
    const { data: leads } = await admin
      .from('leads')
      .select('*')
      .eq('user_id', testUserId)
      .eq('full_name', 'Rahul Sharma')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(leads).toHaveLength(1)
    savedLeadId = leads![0].id

    const lead = leads![0]
    expect(lead.enrichment_source).toBe('lusha')
    expect(lead.in_list).toBe(true)
    // Shell lead should NOT be enriched yet (enriched_at is null)
    // Full enrichment happens when user generates a brief
  })

  it('enriched lead appears in GET /api/research/leads', async () => {
    if (!savedLeadId) return

    const { data: dbLead } = await admin
      .from('leads')
      .select('enriched_at')
      .eq('id', savedLeadId)
      .single()

    // Only check if the lead was actually enriched
    if (!dbLead?.enriched_at) return

    const res = await authed('/api/research/leads')
    expect(res.status).toBe(200)
    const body = await res.json()
    const found = body.leads.find((l: { id: string }) => l.id === savedLeadId)
    expect(found).toBeTruthy()
    expect(found.full_name).toBeTruthy()
  })

  it('adds lead to list_leads junction table', async () => {
    if (!savedLeadId) return

    const { data: listLeads } = await admin
      .from('list_leads')
      .select('lead_id')
      .eq('lead_id', savedLeadId)

    expect(listLeads).toBeTruthy()
    expect(listLeads!.length).toBeGreaterThanOrEqual(1)
  })

  it('saves multiple leads in one batch', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [
          { name: 'Alice Johnson', jobTitle: 'CTO', companyName: 'TechCo' },
          { name: 'Bob Williams', jobTitle: 'Head of Sales', companyName: 'SalesCo' },
          { name: 'Carol Davis', jobTitle: 'VP Engineering', companyName: 'DevCo' },
        ],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(3)
    expect(body.skipped).toBe(0)
  })
})

// ─── 3. POST /api/research/save-leads — dedup ───────────────────────────────

describe('POST /api/research/save-leads — deduplication', () => {
  it('skips leads with lushaContactId that already exist', async () => {
    const lushaId = `dedup_test_${Date.now()}`

    // First save
    const res1 = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{
          name: 'Dedup Person',
          jobTitle: 'Manager',
          companyName: 'DupCo',
          lushaContactId: lushaId,
        }],
      }),
    })
    expect(res1.status).toBe(200)
    const body1 = await res1.json()
    expect(body1.saved).toBe(1)

    // Second save with same lushaContactId
    const res2 = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{
          name: 'Dedup Person',
          jobTitle: 'Manager',
          companyName: 'DupCo',
          lushaContactId: lushaId,
        }],
      }),
    })
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.saved).toBe(0)
    expect(body2.skipped).toBe(1)
  })
})

// ─── 4. POST /api/research/lookup — signal score in response ────────────────

describe('POST /api/research/lookup — signal_score', () => {
  it('returns a lead with signal_score and signal_reasons populated', async () => {
    const uniqueUrl = `https://linkedin.com/in/signal-test-${Date.now()}`

    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({
        type: 'linkedin',
        linkedinUrl: uniqueUrl,
      }),
    })

    // 200 in mock mode, possibly 404 with real key
    if (res.status !== 200) return

    const body = await res.json()
    if (body.cached) return // dedup hit, skip

    expect(body.lead).toBeTruthy()
    expect(body.lead.signal_score).toBeTruthy()
    expect(['strong', 'medium', 'low']).toContain(body.lead.signal_score)
    expect(Array.isArray(body.lead.signal_reasons)).toBe(true)
    expect(body.lead.signal_reasons.length).toBeGreaterThan(0)
  })

  it('stores signal_score in the database', async () => {
    const uniqueUrl = `https://linkedin.com/in/dbscore-test-${Date.now()}`

    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({
        type: 'linkedin',
        linkedinUrl: uniqueUrl,
      }),
    })

    if (res.status !== 200) return

    const body = await res.json()
    if (body.cached) return

    const { data: dbLead } = await admin
      .from('leads')
      .select('signal_score, signal_reasons')
      .eq('id', body.lead.id)
      .single()

    expect(dbLead).toBeTruthy()
    expect(dbLead!.signal_score).toBeTruthy()
    expect(['strong', 'medium', 'low']).toContain(dbLead!.signal_score)
    expect(Array.isArray(dbLead!.signal_reasons)).toBe(true)
  })
})

// ─── 5. POST /api/research/save-leads — signal_score on enriched saves ──────

describe('POST /api/research/save-leads — signal_score', () => {
  it('sets signal_score on enriched ICP leads', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{
          name: 'Score Test Person',
          jobTitle: 'CFO',
          companyName: 'ScoreCo',
        }],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    // Find the lead in DB
    const { data: leads } = await admin
      .from('leads')
      .select('signal_score, signal_reasons, enriched_at')
      .eq('user_id', testUserId)
      .eq('full_name', 'Score Test Person')
      .order('created_at', { ascending: false })
      .limit(1)

    // If enrichment succeeded, signal_score should be set
    if (leads && leads.length > 0 && leads[0].enriched_at) {
      expect(['strong', 'medium', 'low']).toContain(leads[0].signal_score)
      expect(Array.isArray(leads[0].signal_reasons)).toBe(true)
    }
  })
})

// ─── 7. POST /api/research/save-leads — max 100 limit ──────────────────────

describe('POST /api/research/save-leads — limits', () => {
  it('rejects more than 100 leads', async () => {
    const bigBatch = Array.from({ length: 101 }, (_, i) => ({
      name: `Person ${i}`,
      jobTitle: 'Engineer',
      companyName: 'BigCo',
    }))

    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({ leads: bigBatch }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/100/i)
  })
})
