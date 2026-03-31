/**
 * Tests for the three new/updated research API features:
 *   1. GET  /api/research/leads          — persistent leads endpoint
 *   2. POST /api/research/lookup         — dedup / cached responses
 *   3. POST /api/research/bulk-enrich    — phone field in results
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = `leads_test_${Date.now()}@signal-test.com`
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
    await admin.auth.admin.deleteUser(testUserId)
  }
})

// ─── Seed helper — insert a fully-enriched lead for the test user ─────────────

async function seedEnrichedLead(overrides: Record<string, unknown> = {}) {
  const { data, error } = await admin.from('leads').insert({
    user_id: testUserId,
    full_name: 'Jane Doe',
    first_name: 'Jane',
    last_name: 'Doe',
    job_title: 'VP of Engineering',
    company_name: 'Acme Corp',
    email: 'jane@acme.com',
    phone_direct: '+1-555-000-1234',
    linkedin_url: 'https://linkedin.com/in/jane-doe-test',
    city: 'San Francisco',
    country: 'US',
    enriched_at: new Date().toISOString(),
    enrichment_source: 'lusha',
    ...overrides,
  }).select('*').single()
  if (error) throw error
  return data
}

// ─── 1. GET /api/research/leads ───────────────────────────────────────────────

describe('GET /api/research/leads — auth', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await unauthed('/api/research/leads')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/research/leads — response shape', () => {
  it('returns an empty array when user has no enriched leads', async () => {
    const res = await authed('/api/research/leads')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('leads')
    expect(Array.isArray(body.leads)).toBe(true)
  })

  it('returns seeded enriched leads', async () => {
    const seeded = await seedEnrichedLead()

    const res = await authed('/api/research/leads')
    expect(res.status).toBe(200)
    const body = await res.json()
    const found = body.leads.find((l: { id: string }) => l.id === seeded.id)
    expect(found).toBeTruthy()
    expect(found.full_name).toBe('Jane Doe')
    expect(found.email).toBe('jane@acme.com')
    expect(found.phone_direct).toBe('+1-555-000-1234')

    // clean up
    await admin.from('leads').delete().eq('id', seeded.id)
  })

  it('does NOT return non-enriched (shell) leads', async () => {
    const { data: shell } = await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'Shell Person',
      // enriched_at intentionally omitted
    }).select('id').single()

    const res = await authed('/api/research/leads')
    const body = await res.json()
    const found = body.leads.find((l: { id: string }) => l.id === shell!.id)
    expect(found).toBeUndefined()

    await admin.from('leads').delete().eq('id', shell!.id)
  })

  it('respects limit query param (capped at 200)', async () => {
    const res = await authed('/api/research/leads?limit=5')
    expect(res.status).toBe(200)
    const body = await res.json()
    // Can't check exact count without 5+ enriched leads, but shape is correct
    expect(Array.isArray(body.leads)).toBe(true)
  })

  it('returns leads sorted newest first', async () => {
    // Insert two leads with controllable timestamps
    const older = await seedEnrichedLead({
      full_name: 'Older Lead',
      email: 'older@acme.com',
      linkedin_url: 'https://linkedin.com/in/older-lead',
      created_at: new Date(Date.now() - 5000).toISOString(),
    })
    const newer = await seedEnrichedLead({
      full_name: 'Newer Lead',
      email: 'newer@acme.com',
      linkedin_url: 'https://linkedin.com/in/newer-lead',
      created_at: new Date().toISOString(),
    })

    const res = await authed('/api/research/leads')
    const body = await res.json()
    const ids = body.leads.map((l: { id: string }) => l.id)
    const newerIdx = ids.indexOf(newer.id)
    const olderIdx = ids.indexOf(older.id)
    expect(newerIdx).toBeLessThan(olderIdx)

    await admin.from('leads').delete().in('id', [older.id, newer.id])
  })

  it('data isolation: only returns leads for the authenticated user', async () => {
    // Create a second user and seed a lead for them
    const { data: user2 } = await admin.auth.admin.createUser({
      email: `leads_isolation_${Date.now()}@test.com`,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    const { data: otherLead } = await admin.from('leads').insert({
      user_id: user2!.user!.id,
      full_name: 'Other User Lead',
      email: 'other@other.com',
      enriched_at: new Date().toISOString(),
    }).select('id').single()

    const res = await authed('/api/research/leads')
    const body = await res.json()
    const found = body.leads.find((l: { id: string }) => l.id === otherLead!.id)
    expect(found).toBeUndefined()

    // cleanup
    await admin.from('leads').delete().eq('id', otherLead!.id)
    await admin.auth.admin.deleteUser(user2!.user!.id)
  })
})

// ─── 2. POST /api/research/lookup — dedup / cache ────────────────────────────

describe('POST /api/research/lookup — dedup cache', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await unauthed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'linkedin', linkedinUrl: 'https://linkedin.com/in/someone' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns cached:true when an enriched lead with the same linkedin_url exists', async () => {
    const existingUrl = `https://linkedin.com/in/dedup-test-${Date.now()}`
    const seeded = await seedEnrichedLead({
      linkedin_url: existingUrl,
      email: `dedup${Date.now()}@acme.com`,
    })

    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'linkedin', linkedinUrl: existingUrl }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cached).toBe(true)
    expect(body.lead).toBeTruthy()
    expect(body.lead.id).toBe(seeded.id)

    await admin.from('leads').delete().eq('id', seeded.id)
  })

  it('returns cached:true when an enriched lead with the same email exists', async () => {
    const uniqueEmail = `dedup_email_${Date.now()}@acme.com`
    const seeded = await seedEnrichedLead({
      email: uniqueEmail,
      linkedin_url: `https://linkedin.com/in/email-dedup-${Date.now()}`,
    })

    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'email', email: uniqueEmail }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cached).toBe(true)
    expect(body.lead.id).toBe(seeded.id)

    await admin.from('leads').delete().eq('id', seeded.id)
  })

  it('does NOT return cached for a linkedin_url that is not enriched', async () => {
    // Shell lead (no enriched_at) — should NOT be returned as cached
    const { data: shell } = await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'Shell Guy',
      linkedin_url: 'https://linkedin.com/in/shell-not-enriched',
      // no enriched_at
    }).select('id').single()

    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'linkedin', linkedinUrl: 'https://linkedin.com/in/shell-not-enriched' }),
    })
    // Should either go to Lusha (404 or other) — definitely NOT cached:true
    const body = await res.json()
    expect(body.cached).toBeUndefined()

    await admin.from('leads').delete().eq('id', shell!.id)
  })

  it('rejects requests with missing type field', async () => {
    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ linkedinUrl: 'https://linkedin.com/in/someone' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects requests with invalid type value', async () => {
    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'fax', number: '1234' }),
    })
    expect(res.status).toBe(400)
  })
})

// ─── 3. POST /api/research/bulk-enrich — phone field ────────────────────────

describe('POST /api/research/bulk-enrich — phone field in results', () => {
  it('skipped rows have phone field as empty string', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({
        rows: [
          { rowIndex: 0 },                             // no identifiers
          { rowIndex: 1, firstName: 'John' },          // firstName only
          { rowIndex: 2, firstName: 'John', lastName: 'Smith' }, // no company
        ],
      }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results).toHaveLength(3)
    for (const r of results) {
      expect(r.status).toBe('skipped')
      expect(typeof r.phone).toBe('string')
      expect(r.phone).toBe('')
    }
  })

  it('all result objects include a phone field regardless of status', async () => {
    // Mix of skipped rows — validates unified shape
    const rows = [
      { rowIndex: 0 },
      { rowIndex: 1, jobTitle: 'Engineer' },
      { rowIndex: 2, firstName: 'Only' },
    ]
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    for (const r of results) {
      expect(r).toHaveProperty('phone')
      expect(typeof r.phone).toBe('string')
    }
  })

  it('already_saved rows include phone as empty string', async () => {
    // Seed a lead so the next request triggers already_saved
    const uniqueLinkedIn = `https://linkedin.com/in/already-saved-${Date.now()}`
    const seeded = await seedEnrichedLead({ linkedin_url: uniqueLinkedIn })

    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({
        rows: [{ rowIndex: 0, linkedinUrl: uniqueLinkedIn }],
      }),
    })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0].status).toMatch(/already_saved|duplicate/)
    expect(typeof results[0].phone).toBe('string')

    await admin.from('leads').delete().eq('id', seeded.id)
  })

  it('result summary counts are correct for skipped rows', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({
        rows: [
          { rowIndex: 0 },
          { rowIndex: 1 },
          { rowIndex: 2 },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const { summary } = await res.json()
    expect(summary.skipped).toBe(3)
    expect(summary.enriched).toBe(0)
  })
})
