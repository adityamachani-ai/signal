import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { validateLlmResponse, fallbackParse } from '../lib/icp-filters'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = `icp_test_${Date.now()}@signal-test.com`
const TEST_PASSWORD = 'Test1234!'
let testUserId: string
let token: string

const HAS_REAL_KEY = !!process.env.LUSHA_API_KEY
const HAS_LLM_KEY = !!process.env.AZURE_OPENAI_API_KEY

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
      if (attempt < 2) {
        await sleep(1500)
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}

// helper for unauthenticated fetches with retry
async function unauthFetch(path: string, options: RequestInit = {}): Promise<Response> {
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

// ─── Unit tests: validateLlmResponse ──────────────────────────────────────────

describe('validateLlmResponse (unit)', () => {
  it('passes through valid departments and strips invalid ones', () => {
    const raw = {
      jobTitles: ['VP Sales'],
      departments: ['Sales', 'InvalidDept', 'Engineering & Technical'],
      seniorities: ['Vice President'],
      locations: [],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw, 'test')
    expect(result.departments).toEqual(['Sales', 'Engineering & Technical'])
  })

  it('strips invalid seniority values and maps valid ones to IDs', () => {
    const raw = {
      jobTitles: ['CTO'],
      departments: [],
      seniorities: ['C-Suite', 'SuperSenior', 'Director'],
      locations: [],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw, 'test')
    expect(result.seniorities).toEqual(['C-Suite', 'Director'])
    expect(result.seniorityIds).toEqual(['9', '6'])
  })

  it('filters out locations with invalid countries', () => {
    const raw = {
      jobTitles: ['VP Sales'],
      departments: [],
      seniorities: [],
      locations: [
        { country: 'India', city: 'Mumbai' },
        { country: 'Narnia' },
        { city: 'Bangalore' },
        { country: 'United States' },
      ],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw, 'test')
    expect(result.locations).toEqual([
      { country: 'India', city: 'Mumbai' },
      { city: 'Bangalore' },
      { country: 'United States' },
    ])
  })

  it('caps jobTitles at 5', () => {
    const raw = {
      jobTitles: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      departments: [],
      seniorities: [],
      locations: [],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw, 'test')
    expect(result.jobTitles).toHaveLength(5)
  })

  it('caps companyNames at 8', () => {
    const raw = {
      jobTitles: [],
      departments: [],
      seniorities: [],
      locations: [],
      companyNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw, 'test')
    expect(result.companyNames).toHaveLength(8)
  })

  it('caps relatedRoles at 8', () => {
    const raw = {
      jobTitles: [],
      departments: [],
      seniorities: [],
      locations: [],
      companyNames: [],
      companySizes: [],
      relatedRoles: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw, 'test')
    expect(result.relatedRoles).toHaveLength(8)
  })

  it('handles missing fields gracefully (returns empty arrays)', () => {
    const result = validateLlmResponse({}, 'my query')
    expect(result.jobTitles).toEqual([])
    expect(result.departments).toEqual([])
    expect(result.seniorities).toEqual([])
    expect(result.locations).toEqual([])
    expect(result.companyNames).toEqual([])
    expect(result.companySizes).toEqual([])
    expect(result.relatedRoles).toEqual([])
    expect(result.notes).toEqual([])
    expect(result.seniorityIds).toEqual([])
    expect(result.summary).toBe('my query')
  })

  it('handles non-array values (returns empty arrays)', () => {
    const raw = {
      jobTitles: 'not an array',
      departments: 42,
      seniorities: null,
      locations: 'string',
      companyNames: true,
      companySizes: {},
      relatedRoles: undefined,
      notes: 123,
      summary: 'valid summary',
    }
    const result = validateLlmResponse(raw as Record<string, unknown>, 'fallback')
    expect(result.jobTitles).toEqual([])
    expect(result.departments).toEqual([])
    expect(result.seniorities).toEqual([])
    expect(result.locations).toEqual([])
    expect(result.companyNames).toEqual([])
    expect(result.companySizes).toEqual([])
    expect(result.relatedRoles).toEqual([])
    expect(result.notes).toEqual([])
    expect(result.summary).toBe('valid summary')
  })

  it('strips non-string values from string arrays', () => {
    const raw = {
      jobTitles: ['VP Sales', 42, null, 'CTO', true],
      departments: ['Sales', undefined, 'Engineering & Technical'],
      seniorities: [],
      locations: [],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw as Record<string, unknown>, 'test')
    expect(result.jobTitles).toEqual(['VP Sales', 'CTO'])
    expect(result.departments).toEqual(['Sales', 'Engineering & Technical'])
  })

  it('validates companySizes structure (rejects malformed entries)', () => {
    const raw = {
      jobTitles: [],
      departments: [],
      seniorities: [],
      locations: [],
      companyNames: [],
      companySizes: [
        { min: 1, max: 50 },
        { min: 'ten', max: 100 },
        { min: 201, max: 1000 },
        { size: 'large' },
        null,
      ],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw as Record<string, unknown>, 'test')
    expect(result.companySizes).toEqual([
      { min: 1, max: 50 },
      { min: 201, max: 1000 },
    ])
  })

  it('validates location objects (rejects entries without city or country)', () => {
    const raw = {
      jobTitles: [],
      departments: [],
      seniorities: [],
      locations: [
        { country: 'India' },
        { city: 'Mumbai' },
        { region: 'South' },
        null,
        42,
        { country: 'India', city: 'Delhi' },
      ],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw as Record<string, unknown>, 'test')
    expect(result.locations).toEqual([
      { country: 'India' },
      { city: 'Mumbai' },
      { country: 'India', city: 'Delhi' },
    ])
  })

  it('uses query as summary when LLM returns non-string summary', () => {
    const raw = {
      jobTitles: ['CTO'],
      departments: [],
      seniorities: [],
      locations: [],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 123,
    }
    const result = validateLlmResponse(raw as Record<string, unknown>, 'my original query')
    expect(result.summary).toBe('my original query')
  })

  it('maps all valid seniority values correctly', () => {
    const allSeniorities = ['Founder', 'Partner', 'C-Suite', 'Vice President', 'Director', 'Manager', 'Senior', 'Entry', 'Intern', 'Other']
    const expectedIds = ['10', '7', '9', '8', '6', '5', '4', '3', '2', '1']
    const raw = {
      jobTitles: [],
      departments: [],
      seniorities: allSeniorities,
      locations: [],
      companyNames: [],
      companySizes: [],
      relatedRoles: [],
      notes: [],
      summary: 'test',
    }
    const result = validateLlmResponse(raw, 'test')
    expect(result.seniorities).toEqual(allSeniorities)
    expect(result.seniorityIds).toEqual(expectedIds)
  })
})

// ─── Unit tests: fallbackParse ────────────────────────────────────────────────

describe('fallbackParse (unit)', () => {
  it('returns query as jobTitles', () => {
    const result = fallbackParse('VP of Sales at Stripe')
    expect(result.jobTitles).toEqual(['VP of Sales at Stripe'])
  })

  it('returns empty arrays for all other filter fields', () => {
    const result = fallbackParse('some query')
    expect(result.departments).toEqual([])
    expect(result.seniorities).toEqual([])
    expect(result.locations).toEqual([])
    expect(result.companyNames).toEqual([])
    expect(result.companySizes).toEqual([])
    expect(result.relatedRoles).toEqual([])
    expect(result.seniorityIds).toEqual([])
  })

  it('includes LLM unavailable note', () => {
    const result = fallbackParse('test')
    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]).toContain('LLM unavailable')
  })

  it('uses query as summary', () => {
    const result = fallbackParse('CTO at fintech startups')
    expect(result.summary).toBe('CTO at fintech startups')
  })
})

// ─── icp-parse API tests ──────────────────────────────────────────────────────

describe('POST /api/research/icp-parse', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await unauthFetch('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales at SaaS companies' }),
      redirect: 'manual',
    })
    expect([307, 401]).toContain(res.status)
  })

  it('returns 400 when query is missing', async () => {
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('returns 400 when query is empty string', async () => {
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: '   ' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await fetch(`${BASE}/api/research/icp-parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Connection: 'close',
      },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('parses "VP Sales at Series B SaaS" and returns filters', async () => {
    if (!HAS_LLM_KEY) {
      console.log('Skipping LLM test — no AZURE_OPENAI_API_KEY set')
      return
    }
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales at Series B SaaS companies' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters).toBeTruthy()
    expect(body.filters.jobTitles).toBeInstanceOf(Array)
    expect(body.filters.jobTitles.length).toBeGreaterThan(0)
    expect(body.filters.summary).toBeTruthy()
    expect(body.filters.seniorityIds).toBeInstanceOf(Array)
    expect(body.filters.notes).toBeInstanceOf(Array)
    // Seniority IDs should be numeric strings from Lusha's taxonomy
    if (body.filters.seniorityIds.length > 0) {
      expect(Number(body.filters.seniorityIds[0])).toBeGreaterThan(0)
    }
  }, 20000)

  it('parses "collection head in major Indian banks" and extracts company names', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'collection head in major Indian banks' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.jobTitles.length).toBeGreaterThan(0)
    // GPT should identify this is India
    const locationCountries = body.filters.locations.map((l: { country?: string; city?: string }) => l.country)
    const hasIndia = locationCountries.includes('India') || body.filters.companyNames.length > 0
    expect(hasIndia).toBe(true)
  }, 20000)

  it('parses location-specific query and expands regional terms', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'CTO at fintech startups in South India' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    // "South India" should be expanded to cities
    const hasCities = body.filters.locations.some((l: { city?: string }) => l.city)
    expect(hasCities || body.filters.locations.length > 0).toBe(true)
  }, 20000)

  it('filters out invalid department values from LLM response', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'Head of Engineering at enterprise software companies' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const VALID_DEPARTMENTS = [
      'Business Development', 'Consulting', 'Customer Service', 'Engineering & Technical',
      'Finance', 'General Management', 'Health Care & Medical', 'Human Resources',
      'Information Technology', 'Legal', 'Marketing', 'Operations', 'Other',
      'Product', 'Research & Analytics', 'Sales',
    ]
    for (const dept of body.filters.departments) {
      expect(VALID_DEPARTMENTS).toContain(dept)
    }
  }, 20000)

  it('filters out invalid seniority values and maps them to IDs', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'C-level executives at large manufacturing companies' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const VALID_SENIORITY_NAMES = ['Founder', 'Partner', 'C-Suite', 'Vice President', 'Director', 'Manager', 'Senior', 'Entry', 'Intern', 'Other']
    for (const s of body.filters.seniorities) {
      expect(VALID_SENIORITY_NAMES).toContain(s)
    }
  }, 20000)
})

// ─── LLM parse: company detection tests ───────────────────────────────────────

describe('POST /api/research/icp-parse — LLM company detection', () => {
  it('extracts company from "cofounder of company dpdzero"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'cofounder of company dpdzero' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companyNames.length).toBeGreaterThan(0)
    expect(body.filters.companyNames.some((c: string) => c.toLowerCase().includes('dpdzero'))).toBe(true)
  }, 20000)

  it('extracts company from "CEO from Google"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'CEO from Google' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companyNames.some((c: string) => c.toLowerCase().includes('google'))).toBe(true)
  }, 20000)

  it('extracts company from "VP Sales for Razorpay"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales for Razorpay' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companyNames.some((c: string) => c.toLowerCase().includes('razorpay'))).toBe(true)
  }, 20000)

  it('extracts company from "Head of Engineering at Stripe"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'Head of Engineering at Stripe' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companyNames.some((c: string) => c.toLowerCase().includes('stripe'))).toBe(true)
  }, 20000)

  it('expands "major Indian banks" to specific company names', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'collection head at major Indian banks' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companyNames.length).toBeGreaterThanOrEqual(3)
  }, 20000)

  it('returns empty companyNames when no company is mentioned', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP of Sales in India' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companyNames.length).toBe(0)
  }, 20000)
})

// ─── LLM parse: relatedRoles tests ───────────────────────────────────────────

describe('POST /api/research/icp-parse — LLM relatedRoles', () => {
  it('returns relatedRoles for "VP of Sales"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP of Sales at SaaS companies' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.relatedRoles).toBeInstanceOf(Array)
    expect(body.filters.relatedRoles.length).toBeGreaterThan(0)
    expect(body.filters.relatedRoles.length).toBeLessThanOrEqual(8)
  }, 20000)

  it('returns relatedRoles for "CTO"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'CTO at enterprise companies in the US' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.relatedRoles.length).toBeGreaterThan(0)
  }, 20000)

  it('returns relatedRoles for "founder"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'founder of fintech startups in India' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.relatedRoles.length).toBeGreaterThan(0)
  }, 20000)
})

// ─── LLM parse: location & size tests ────────────────────────────────────────

describe('POST /api/research/icp-parse — LLM locations & sizes', () => {
  it('extracts country from "VP Sales in India"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales in India' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.locations.some((l: { country?: string }) => l.country === 'India')).toBe(true)
  }, 20000)

  it('extracts city from "CTO in Bangalore"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'CTO in Bangalore' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    // LLM should return at least one location referencing Bangalore/Bengaluru/India
    const hasLocation = body.filters.locations.some((l: { city?: string; country?: string }) =>
      (l.city && (l.city.includes('Bangalore') || l.city.includes('Bengaluru'))) ||
      l.country === 'India'
    )
    expect(hasLocation).toBe(true)
  }, 20000)

  it('expands "South India" to cities or country', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'CTO at fintech startups in South India' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    // LLM should return at least one location (cities or India as country)
    expect(body.filters.locations.length).toBeGreaterThanOrEqual(1)
  }, 20000)

  it('returns valid country names only', async () => {
    if (!HAS_LLM_KEY) return
    const VALID_COUNTRIES = [
      'United States', 'India', 'United Kingdom', 'Brazil', 'Canada', 'Australia',
      'France', 'Germany', 'Netherlands', 'Italy', 'South Africa', 'Mexico',
      'Turkey', 'Sweden', 'China', 'Indonesia', 'Belgium', 'Spain',
      'United Arab Emirates', 'Argentina', 'Switzerland', 'Singapore', 'Saudi Arabia',
      'Ireland', 'Colombia', 'Chile', 'Malaysia', 'Egypt', 'Nigeria', 'Japan',
      'Hong Kong', 'Finland', 'Denmark', 'Taiwan', 'Bangladesh', 'Austria',
      'Czech Republic', 'Peru', 'Kenya', 'Vietnam', 'Poland', 'Ukraine', 'Thailand',
      'South Korea', 'New Zealand', 'Portugal',
    ]
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales in UK and Germany' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    for (const loc of body.filters.locations) {
      if (loc.country) {
        expect(VALID_COUNTRIES).toContain(loc.country)
      }
    }
  }, 20000)

  it('extracts companySizes for "startup"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'CTO at startups' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companySizes.length).toBeGreaterThan(0)
    expect(body.filters.companySizes[0].min).toBeDefined()
    expect(body.filters.companySizes[0].max).toBeDefined()
  }, 20000)

  it('extracts companySizes for "enterprise"', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Engineering at enterprise companies' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.companySizes.length).toBeGreaterThan(0)
    expect(body.filters.companySizes[0].min).toBeGreaterThanOrEqual(1000)
  }, 20000)
})

// ─── LLM parse: complex queries ──────────────────────────────────────────────

describe('POST /api/research/icp-parse — LLM complex queries', () => {
  it('handles multi-constraint query', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'Head of Product at mid-size SaaS companies in San Francisco' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    // At minimum, job titles should be extracted
    expect(body.filters.jobTitles.length).toBeGreaterThan(0)
    // Location and size are LLM-dependent but at least one should be present
    const hasConstraints = body.filters.locations.length > 0 || body.filters.companySizes.length > 0
    expect(hasConstraints).toBe(true)
  }, 20000)

  it('returns summary for any query', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales at Series B fintech in Mumbai' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.filters.summary).toBe('string')
    expect(body.filters.summary.length).toBeGreaterThan(0)
  }, 20000)

  it('returns notes explaining interpretations', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'collection head in top Indian NBFCs' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.notes).toBeInstanceOf(Array)
  }, 20000)

  it('handles vague query gracefully (falls back to job title search)', async () => {
    if (!HAS_LLM_KEY) return
    const res = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'people who do marketing stuff' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filters.jobTitles.length).toBeGreaterThan(0)
  }, 20000)
})

// ─── icp-search tests ─────────────────────────────────────────────────────────

describe('POST /api/research/icp-search', () => {
  const baseFilters = {
    jobTitles: ['VP of Sales'],
    departments: [],
    seniorities: ['Vice President'],
    seniorityIds: ['8'],
    locations: [],
    companyNames: [],
    companySizes: [],
    notes: [],
    summary: 'VP of Sales',
  }

  it('rejects unauthenticated requests', async () => {
    const res = await unauthFetch('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters }),
      redirect: 'manual',
    })
    expect([307, 401]).toContain(res.status)
  })

  it('returns 400 when filters is missing', async () => {
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns results with correct shape', async () => {
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 10, maxPerCompany: 3 }),
    })
    // Accept 200 (success) or 4xx (Lusha rejected the filter combo in real mode)
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)

    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
      expect(typeof body.totalResults).toBe('number')
      expect(typeof body.creditsCharged).toBe('number')
      expect(body.appliedFilters).toBeTruthy()
      if (body.results.length > 0) {
        const r = body.results[0]
        expect(r.contactId).toBeTruthy()
        expect(r.name).toBeTruthy()
        expect(typeof r.hasEmail).toBe('boolean')
        expect(typeof r.hasPhone).toBe('boolean')
      }
    }
  }, 15000)

  it('respects the limit parameter', async () => {
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 10, maxPerCompany: 10 }),
    })
    if (res.status !== 200) return
    const body = await res.json()
    expect(body.results.length).toBeLessThanOrEqual(10)
  }, 15000)

  it('enforces max per company (no company appears more than maxPerCompany times)', async () => {
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 25, maxPerCompany: 2 }),
    })
    if (res.status !== 200) return
    const body = await res.json()
    const companyCount: Record<string, number> = {}
    for (const r of body.results) {
      const key = r.companyName?.toLowerCase() ?? 'unknown'
      companyCount[key] = (companyCount[key] ?? 0) + 1
      expect(companyCount[key]).toBeLessThanOrEqual(2)
    }
  }, 15000)

  it('returns creditsCharged as a number', async () => {
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 10, maxPerCompany: 3 }),
    })
    if (res.status !== 200) return
    const body = await res.json()
    expect(typeof body.creditsCharged).toBe('number')
    expect(body.creditsCharged).toBeGreaterThanOrEqual(0)
  }, 15000)

  it('works with company names filter', async () => {
    const filtersWithCompanies = {
      ...baseFilters,
      jobTitles: ['Head of Collections'],
      seniorities: [],
      seniorityIds: [],
      companyNames: ['HDFC Bank', 'ICICI Bank', 'SBI'],
      locations: [{ country: 'India' }],
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: filtersWithCompanies, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
    }
  }, 15000)

  it('works with location filter', async () => {
    const filtersWithLocation = {
      ...baseFilters,
      locations: [{ country: 'India' }],
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: filtersWithLocation, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400] : [200]
    expect(validStatuses).toContain(res.status)
  }, 15000)
})

// ─── Pagination tests ─────────────────────────────────────────────────────────

describe('POST /api/research/icp-search — pagination', () => {
  const baseFilters = {
    jobTitles: ['VP of Sales'],
    departments: [],
    seniorities: ['Vice President'],
    seniorityIds: ['8'],
    locations: [],
    companyNames: [],
    companySizes: [],
    notes: [],
    summary: 'VP of Sales',
  }

  it('accepts page parameter and returns results', async () => {
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 25, maxPerCompany: 3, page: 0 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
      expect(body.results.length).toBeLessThanOrEqual(25)
    }
  }, 15000)

  it('page 1 returns different results than page 0 (when enough data)', async () => {
    const res0 = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 5, maxPerCompany: 3, page: 0 }),
    })
    if (res0.status !== 200) return
    const body0 = await res0.json()

    const res1 = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 5, maxPerCompany: 3, page: 1 }),
    })
    if (res1.status !== 200) return
    const body1 = await res1.json()

    // If there are enough results for 2 pages, contact IDs should differ
    // (Mock mode returns identical pages, so only check with real API)
    if (HAS_REAL_KEY && body0.totalResults > 5 && body1.results.length > 0) {
      const ids0 = new Set(body0.results.map((r: { contactId: string }) => r.contactId))
      const ids1 = body1.results.map((r: { contactId: string }) => r.contactId)
      const overlap = ids1.filter((id: string) => ids0.has(id))
      // Some overlap possible due to per-company dedup, but shouldn't be 100%
      expect(overlap.length).toBeLessThan(ids1.length)
    }
  }, 30000)

  it('defaults to page 0 when page param is omitted', async () => {
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: baseFilters, limit: 5, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
    }
  }, 15000)
})

// ─── Filter-only search (no AI parse, manual filters) ─────────────────────────

describe('POST /api/research/icp-search — manual filter combinations', () => {
  it('works with only job titles (minimum viable filter)', async () => {
    const filters = {
      jobTitles: ['CTO'],
      departments: [],
      seniorities: [],
      seniorityIds: [],
      locations: [],
      companyNames: [],
      companySizes: [],
      notes: [],
      summary: 'CTO',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
      expect(body.totalResults).toBeGreaterThanOrEqual(0)
    }
  }, 15000)

  it('works with only seniority filter', async () => {
    const filters = {
      jobTitles: [],
      departments: [],
      seniorities: ['C-Suite'],
      seniorityIds: ['9'],
      locations: [],
      companyNames: [],
      companySizes: [],
      notes: [],
      summary: 'C-Suite executives',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    // Lusha may reject seniority-only filters in real mode, that's fine
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
  }, 15000)

  it('works with department + seniority combination', async () => {
    const filters = {
      jobTitles: [],
      departments: ['Engineering & Technical'],
      seniorities: ['Director'],
      seniorityIds: ['6'],
      locations: [{ country: 'United States' }],
      companyNames: [],
      companySizes: [],
      notes: [],
      summary: 'Engineering Directors in the US',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
    }
  }, 15000)

  it('works with company size filter', async () => {
    const filters = {
      jobTitles: ['VP of Sales'],
      departments: [],
      seniorities: ['Vice President'],
      seniorityIds: ['8'],
      locations: [],
      companyNames: [],
      companySizes: [{ min: 201, max: 1000 }],
      notes: [],
      summary: 'VP of Sales at mid-size companies',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
  }, 15000)

  it('works with multiple combined filters (job + location + company + size)', async () => {
    const filters = {
      jobTitles: ['Head of Product'],
      departments: ['Product'],
      seniorities: ['Director'],
      seniorityIds: ['6'],
      locations: [{ country: 'India', city: 'Bangalore' }],
      companyNames: [],
      companySizes: [{ min: 51, max: 200 }],
      notes: [],
      summary: 'Product Directors in Bangalore',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
      expect(body.appliedFilters).toBeTruthy()
      expect(body.appliedFilters.locations).toEqual([{ country: 'India', city: 'Bangalore' }])
    }
  }, 15000)

  it('returns appliedFilters matching what was sent', async () => {
    const filters = {
      jobTitles: ['CTO', 'VP Engineering'],
      departments: ['Engineering & Technical'],
      seniorities: ['C-Suite', 'Vice President'],
      seniorityIds: ['9', '8'],
      locations: [{ country: 'United States' }],
      companyNames: [],
      companySizes: [],
      notes: [],
      summary: 'Tech leaders in the US',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.appliedFilters.jobTitles).toEqual(['CTO', 'VP Engineering'])
      expect(body.appliedFilters.departments).toEqual(['Engineering & Technical'])
    }
  }, 15000)
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('POST /api/research/icp-search — edge cases', () => {
  it('returns empty results gracefully for impossible filter combo', async () => {
    const filters = {
      jobTitles: ['zzznonexistenttitle999'],
      departments: [],
      seniorities: [],
      seniorityIds: [],
      locations: [],
      companyNames: ['zzznonexistentcompany999'],
      companySizes: [],
      notes: [],
      summary: 'Impossible search',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    // Should return 200 with empty results, or 400 from Lusha
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results).toBeInstanceOf(Array)
      expect(typeof body.totalResults).toBe('number')
    }
  }, 15000)

  it('handles limit=1 correctly', async () => {
    const filters = {
      jobTitles: ['VP of Sales'],
      departments: [],
      seniorities: [],
      seniorityIds: [],
      locations: [],
      companyNames: [],
      companySizes: [],
      notes: [],
      summary: 'VP of Sales',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 1, maxPerCompany: 1 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      expect(body.results.length).toBeLessThanOrEqual(1)
    }
  }, 15000)

  it('caps limit at 50 even if client sends higher', async () => {
    const filters = {
      jobTitles: ['VP of Sales'],
      departments: [],
      seniorities: [],
      seniorityIds: [],
      locations: [],
      companyNames: [],
      companySizes: [],
      notes: [],
      summary: 'VP of Sales',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 999, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
    if (res.status === 200) {
      const body = await res.json()
      // Backend caps at 50
      expect(body.results.length).toBeLessThanOrEqual(50)
    }
  }, 15000)

  it('handles city-only location filter', async () => {
    const filters = {
      jobTitles: ['VP of Sales'],
      departments: [],
      seniorities: [],
      seniorityIds: [],
      locations: [{ city: 'Bangalore' }],
      companyNames: [],
      companySizes: [],
      notes: [],
      summary: 'VP of Sales in Bangalore',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
  }, 15000)

  it('handles multiple company size ranges', async () => {
    const filters = {
      jobTitles: ['VP of Sales'],
      departments: [],
      seniorities: [],
      seniorityIds: [],
      locations: [],
      companyNames: [],
      companySizes: [{ min: 51, max: 200 }, { min: 201, max: 1000 }],
      notes: [],
      summary: 'VP of Sales at small to mid-size companies',
    }
    const res = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400, 422] : [200]
    expect(validStatuses).toContain(res.status)
  }, 15000)
})

// ─── End-to-end: parse → search ───────────────────────────────────────────────

describe('ICP Discovery end-to-end (parse → search)', () => {
  it('correctly flows from natural language to search results', async () => {
    if (!HAS_LLM_KEY) {
      console.log('Skipping E2E test — no LLM key')
      return
    }

    // Step 1: Parse
    const parseRes = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales at software companies in India' }),
    })
    expect(parseRes.status).toBe(200)
    const { filters } = await parseRes.json()
    expect(filters.jobTitles.length).toBeGreaterThan(0)

    // Step 2: Search using parsed filters
    const searchRes = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400] : [200]
    expect(validStatuses).toContain(searchRes.status)

    if (searchRes.status === 200) {
      const body = await searchRes.json()
      expect(body.results).toBeInstanceOf(Array)
      expect(typeof body.totalResults).toBe('number')
      expect(typeof body.creditsCharged).toBe('number')
      expect(body.creditsCharged).toBeGreaterThanOrEqual(0)
    }
  }, 30000)

  it('parse → edit filters → re-search produces valid results', async () => {
    if (!HAS_LLM_KEY) {
      console.log('Skipping E2E test — no LLM key')
      return
    }

    // Step 1: Parse
    const parseRes = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales at SaaS companies' }),
    })
    expect(parseRes.status).toBe(200)
    const { filters } = await parseRes.json()

    // Step 2: Simulate user editing parsed filters (add location, change seniority)
    const editedFilters = {
      ...filters,
      locations: [{ country: 'India' }],
      seniorities: [...filters.seniorities, 'Director'],
      seniorityIds: [...filters.seniorityIds, '6'],
    }

    // Step 3: Search with edited filters
    const searchRes = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters: editedFilters, limit: 10, maxPerCompany: 3 }),
    })
    const validStatuses = HAS_REAL_KEY ? [200, 400] : [200]
    expect(validStatuses).toContain(searchRes.status)

    if (searchRes.status === 200) {
      const body = await searchRes.json()
      expect(body.results).toBeInstanceOf(Array)
      // Applied filters should reflect the edits
      expect(body.appliedFilters.locations).toEqual([{ country: 'India' }])
    }
  }, 30000)

  it('paginated search across pages returns consistent totalResults', async () => {
    if (!HAS_LLM_KEY) {
      console.log('Skipping E2E test — no LLM key')
      return
    }

    const parseRes = await authed('/api/research/icp-parse', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Sales at software companies' }),
    })
    expect(parseRes.status).toBe(200)
    const { filters } = await parseRes.json()

    // Page 0
    const res0 = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 25, maxPerCompany: 3, page: 0 }),
    })
    if (res0.status !== 200) return
    const body0 = await res0.json()

    // Page 1
    const res1 = await authed('/api/research/icp-search', {
      method: 'POST',
      body: JSON.stringify({ filters, limit: 25, maxPerCompany: 3, page: 1 }),
    })
    if (res1.status !== 200) return
    const body1 = await res1.json()

    // totalResults should be consistent across pages
    expect(body0.totalResults).toBe(body1.totalResults)
  }, 45000)
})
