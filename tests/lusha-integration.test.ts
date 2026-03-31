import { describe, it, expect, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// Resilient fetch: retries on socket errors (Next.js dev server drops keep-alive
// connections after ~8 requests, causing ECONNRESET for the next test file).
const _originalFetch = globalThis.fetch
const _sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const headers = new Headers(init?.headers)
  if (!headers.has('Connection')) headers.set('Connection', 'close')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await _originalFetch(input, { ...init, headers })
    } catch (err) {
      if (attempt < 2 && err instanceof TypeError) {
        await _sleep(1500)
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}) as typeof fetch

// Admin client to create/delete test users
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = `lusha_test_${Date.now()}@signal-test.com`
const TEST_PASSWORD = 'Test1234!'
let testUserId: string
let sessionCookie: string
let createdLeadId: string

// True when a real Lusha key is present — changes expected responses
const HAS_REAL_KEY = !!process.env.LUSHA_API_KEY

// ─── Setup: create a test user and get a session cookie ───────────────────────

async function setupSession() {
  // Create user via admin API (skips email confirmation)
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  testUserId = data.user!.id

  // Sign in via the app's login page to get a real session cookie
  const loginRes = await fetch(`${BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    redirect: 'manual',
  })

  // Supabase sets cookies via the callback flow — we sign in directly
  // using the anon client and extract the access token for Bearer auth
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInError) throw signInError

  // Use the access token as a Bearer header for API calls in tests
  sessionCookie = session.session!.access_token
}

// Helper: authenticated fetch using Bearer token
// (Next.js middleware accepts Bearer tokens via Authorization header)
async function authedFetch(path: string, options: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Lusha lookup — mock mode (no API key)', () => {
  it('setup: creates test user and session', async () => {
    await setupSession()
    expect(testUserId).toBeTruthy()
    expect(sessionCookie).toBeTruthy()
  })

  it('POST /api/research/lookup with LinkedIn URL returns a lead and saves to DB', async () => {
    const res = await fetch(`${BASE}/api/research/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({
        type: 'linkedin',
        linkedinUrl: 'https://www.linkedin.com/in/rahul-sharma',
      }),
    })

    // Real API may return 404 if person not in Lusha DB — that's valid
    const validStatuses = HAS_REAL_KEY ? [200, 404] : [200]
    expect(validStatuses).toContain(res.status)

    if (res.status === 200) {
      const body = await res.json()
      expect(body.lead).toBeTruthy()
      expect(body.lead.user_id).toBe(testUserId)
      createdLeadId = body.lead.id

      if (!HAS_REAL_KEY) {
        expect(body.lead.full_name).toBe('Rahul Sharma')
        expect(body.lead.job_title).toBe('VP of Sales')

        const { data: dbLead } = await admin
          .from('leads')
          .select('full_name, job_title')
          .eq('id', createdLeadId)
          .single()
        expect(dbLead?.full_name).toBe('Rahul Sharma')
      }
    }
  })

  it('POST /api/research/lookup with email returns a lead', async () => {
    const res = await fetch(`${BASE}/api/research/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({
        type: 'email',
        email: 'priya.mehta@freshworks.com',
      }),
    })

    const validStatuses = HAS_REAL_KEY ? [200, 404] : [200]
    expect(validStatuses).toContain(res.status)

    if (res.status === 200 && !HAS_REAL_KEY) {
      const body = await res.json()
      expect(body.lead.full_name).toBe('Priya Mehta')
      expect(body.lead.company_name).toBe('Freshworks')
    }
  })

  it('POST /api/research/lookup with name + company returns a lead', async () => {
    const res = await fetch(`${BASE}/api/research/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({
        type: 'name',
        firstName: 'Kiran',
        lastName: 'Rao',
        company: 'Razorpay',
      }),
    })

    const validStatuses = HAS_REAL_KEY ? [200, 404] : [200]
    expect(validStatuses).toContain(res.status)

    if (res.status === 200 && !HAS_REAL_KEY) {
      const body = await res.json()
      expect(body.lead.full_name).toBe('Kiran Rao')
      expect(body.lead.company_name).toBe('Razorpay')
    }
  })

  it('POST /api/research/lookup rejects unauthenticated requests', async () => {
    const res = await fetch(`${BASE}/api/research/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email: 'test@test.com' }),
      redirect: 'manual',
    })
    // Middleware redirects to /login (307) or returns 401
    expect([307, 401]).toContain(res.status)
  })

  it('POST /api/research/lookup with invalid type returns 400', async () => {
    const res = await fetch(`${BASE}/api/research/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({ type: 'invalid' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Add to list', () => {
  it('POST /api/research/add-to-list adds lead to My List in DB', async () => {
    // In real API mode, Lusha may not have found anyone → seed a lead manually
    if (!createdLeadId && HAS_REAL_KEY) {
      const { data: seeded } = await admin
        .from('leads')
        .insert({
          user_id: testUserId,
          lusha_id: `seed_${Date.now()}`,
          full_name: 'Test Lead',
          enrichment_source: 'lusha',
        })
        .select()
        .single()
      createdLeadId = seeded!.id
    }

    expect(createdLeadId).toBeTruthy()

    const res = await fetch(`${BASE}/api/research/add-to-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({ leadIds: [createdLeadId] }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(1)

    // Verify in list_leads table
    const { data: listLeads } = await admin
      .from('list_leads')
      .select('lead_id')
      .eq('lead_id', createdLeadId)

    expect(listLeads).toHaveLength(1)

    // Verify in_list flag updated on lead
    const { data: lead } = await admin
      .from('leads')
      .select('in_list')
      .eq('id', createdLeadId)
      .single()

    expect(lead?.in_list).toBe(true)
  })

  it('handles duplicate add gracefully (no error)', async () => {
    const res = await fetch(`${BASE}/api/research/add-to-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({ leadIds: [createdLeadId] }),
    })
    expect(res.status).toBe(200)
  })

  it('rejects empty leadIds array', async () => {
    const res = await fetch(`${BASE}/api/research/add-to-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({ leadIds: [] }),
    })
    expect(res.status).toBe(400)
  })
})

afterAll(async () => {
  if (testUserId) await admin.auth.admin.deleteUser(testUserId)
})
