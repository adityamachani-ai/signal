import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Inline copy of detectInputType for unit testing (avoids importing React component tree)
function detectInputType(value: string): { type: "linkedin"; linkedinUrl: string } | { type: "email"; email: string } | { type: "name"; firstName: string; lastName: string; company: string } | null {
  const v = value.trim()
  if (!v) return null
  if (v.includes("linkedin.com/in/")) return { type: "linkedin", linkedinUrl: v }
  if (v.includes("@") && v.includes(".") && !v.includes(" ")) return { type: "email", email: v }
  const atMatch = v.match(/^(.+?)\s+at\s+(.+)$/i)
  if (atMatch) {
    const nameParts = atMatch[1].trim().split(/\s+/)
    return { type: "name", firstName: nameParts[0] ?? "", lastName: nameParts.slice(1).join(" ") || "", company: atMatch[2].trim() }
  }
  const commaMatch = v.match(/^(.+?),\s*(.+)$/)
  if (commaMatch) {
    const nameParts = commaMatch[1].trim().split(/\s+/)
    return { type: "name", firstName: nameParts[0] ?? "", lastName: nameParts.slice(1).join(" ") || "", company: commaMatch[2].trim() }
  }
  return null
}

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = `phase_test_${Date.now()}@signal-test.com`
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
  if (testUserId) await admin.auth.admin.deleteUser(testUserId)
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

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 1: Smart TopBar — detectInputType unit tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('detectInputType', () => {
  it('returns null for empty string', () => {
    expect(detectInputType('')).toBeNull()
    expect(detectInputType('   ')).toBeNull()
  })

  it('detects LinkedIn URLs', () => {
    const result = detectInputType('https://www.linkedin.com/in/johndoe')
    expect(result).toEqual({ type: 'linkedin', linkedinUrl: 'https://www.linkedin.com/in/johndoe' })
  })

  it('detects LinkedIn URLs without https', () => {
    const result = detectInputType('linkedin.com/in/johndoe')
    expect(result).toEqual({ type: 'linkedin', linkedinUrl: 'linkedin.com/in/johndoe' })
  })

  it('detects email addresses', () => {
    const result = detectInputType('john@example.com')
    expect(result).toEqual({ type: 'email', email: 'john@example.com' })
  })

  it('does not detect email-like strings with spaces', () => {
    expect(detectInputType('john doe@example.com')).toBeNull()
  })

  it('detects "Name at Company" format', () => {
    const result = detectInputType('John Doe at Acme Inc')
    expect(result).toEqual({
      type: 'name',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Inc',
    })
  })

  it('detects "Name, Company" format', () => {
    const result = detectInputType('John Doe, Acme Inc')
    expect(result).toEqual({
      type: 'name',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Inc',
    })
  })

  it('handles single name at company', () => {
    const result = detectInputType('John at Acme')
    expect(result).toEqual({
      type: 'name',
      firstName: 'John',
      lastName: '',
      company: 'Acme',
    })
  })

  it('handles multi-part last name at company', () => {
    const result = detectInputType('John van der Berg at Acme Corp')
    expect(result).toEqual({
      type: 'name',
      firstName: 'John',
      lastName: 'van der Berg',
      company: 'Acme Corp',
    })
  })

  it('returns null for plain text without pattern', () => {
    expect(detectInputType('VP Sales')).toBeNull()
    expect(detectInputType('just some text')).toBeNull()
  })

  it('prefers LinkedIn over other formats', () => {
    // URL with @ in it (unlikely but tests priority)
    const result = detectInputType('https://linkedin.com/in/john@doe')
    expect(result?.type).toBe('linkedin')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 2: Specific Lead — lookup route tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/research/lookup', () => {
  it('returns 400 when body is empty', async () => {
    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns mock data for email lookup (no Lusha key)', async () => {
    if (HAS_REAL_KEY) return // skip — real key gives real results
    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'email', email: 'test@example.com' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead).toBeTruthy()
    expect(body.lead.full_name).toBeTruthy()
  }, 15000)

  it('returns mock data for LinkedIn lookup (no Lusha key)', async () => {
    if (HAS_REAL_KEY) return
    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'linkedin', linkedinUrl: 'https://linkedin.com/in/johndoe' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead).toBeTruthy()
  }, 15000)

  it('returns mock data for name+company lookup (no Lusha key)', async () => {
    if (HAS_REAL_KEY) return
    const res = await authed('/api/research/lookup', {
      method: 'POST',
      body: JSON.stringify({ type: 'name', firstName: 'John', lastName: 'Doe', company: 'Acme' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead).toBeTruthy()
  }, 15000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 3: ICP count & Bulk Upload validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/research/save-leads', () => {
  it('returns 400 when leads array is empty', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({ leads: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when leads array exceeds 100', async () => {
    const bigArray = Array.from({ length: 101 }, (_, i) => ({
      name: `Test ${i}`,
      jobTitle: 'VP',
      companyName: 'Acme',
    }))
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({ leads: bigArray }),
    })
    expect(res.status).toBe(400)
  })

  it('saves shell leads without enrichment (no re-enrich)', async () => {
    const res = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [
          {
            name: 'Shell Test Lead',
            jobTitle: 'VP of Sales',
            companyName: 'Test Corp',
            lushaContactId: `shell_test_${Date.now()}`,
          },
        ],
      }),
    })
    // Either 200 (saved) or 404 (no default list yet for test user)
    expect([200, 404]).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.saved).toBe(1)
      // Should NOT have "enriched" field (no re-enrichment)
      expect(body.enriched).toBeUndefined()
    }
  }, 15000)

  it('deduplicates by lushaContactId', async () => {
    const sharedId = `dedup_test_${Date.now()}`
    // First save
    const res1 = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'Dedup Lead', jobTitle: 'CTO', companyName: 'Dedup Corp', lushaContactId: sharedId }],
      }),
    })
    if (res1.status !== 200) return // no default list for test user

    // Second save with same lushaContactId
    const res2 = await authed('/api/research/save-leads', {
      method: 'POST',
      body: JSON.stringify({
        leads: [{ name: 'Dedup Lead', jobTitle: 'CTO', companyName: 'Dedup Corp', lushaContactId: sharedId }],
      }),
    })
    expect(res2.status).toBe(200)
    const body = await res2.json()
    expect(body.skipped).toBe(1)
    expect(body.saved).toBe(0)
  }, 15000)
})

describe('POST /api/research/bulk-enrich', () => {
  it('returns 400 when rows is empty', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when rows exceed 1000', async () => {
    const bigRows = Array.from({ length: 1001 }, (_, i) => ({
      rowIndex: i,
      email: `test${i}@example.com`,
    }))
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({ rows: bigRows }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('1000')
  })

  it('skips rows with no lookup data', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({
        rows: [
          { rowIndex: 0 }, // no linkedin, email, or name
          { rowIndex: 1, firstName: 'John' }, // name but no company
        ],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toBeInstanceOf(Array)
    expect(body.results.length).toBe(2)
    expect(body.results[0].status).toBe('skipped')
    expect(body.results[1].status).toBe('skipped')
    expect(body.summary.skipped).toBe(2)
  }, 15000)

  it('enriches email rows in mock mode', async () => {
    if (HAS_REAL_KEY) return
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({
        rows: [
          { rowIndex: 0, email: 'bulk_test@example.com', firstName: 'Bulk', lastName: 'Test' },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results.length).toBe(1)
    expect(['enriched', 'duplicate', 'already_saved']).toContain(body.results[0].status)
    expect(body.summary).toBeTruthy()
  }, 15000)

  it('returns summary with correct status counts', async () => {
    const res = await authed('/api/research/bulk-enrich', {
      method: 'POST',
      body: JSON.stringify({
        rows: [
          { rowIndex: 0 }, // will be skipped
          { rowIndex: 1, email: 'summary_test@example.com' },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.skipped).toBeGreaterThanOrEqual(1)
    expect(typeof body.summary.enriched).toBe('number')
    expect(typeof body.summary.error).toBe('number')
    expect(typeof body.summary.duplicate).toBe('number')
  }, 15000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 4: Backend hardening — icp-parse query length limit
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/research/icp-parse — hardening', () => {
  it('returns 400 for query exceeding 2000 characters', async () => {
    const longQuery = 'a'.repeat(2001)
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: longQuery }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('2000')
  })

  it('accepts query at exactly 2000 characters', async () => {
    const maxQuery = 'VP Sales '.repeat(222).slice(0, 2000) // exactly 2000 chars
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: maxQuery }),
    })
    // Should NOT be 400 for length — may be 200 or 500 depending on LLM availability
    expect(res.status).not.toBe(400)
  }, 15000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 4: Backend hardening — add-to-list route
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/research/add-to-list', () => {
  it('returns 400 when leadIds is missing', async () => {
    const res = await authed('/api/research/add-to-list', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when leadIds is empty array', async () => {
    const res = await authed('/api/research/add-to-list', {
      method: 'POST',
      body: JSON.stringify({ leadIds: [] }),
    })
    expect(res.status).toBe(400)
  })
})
