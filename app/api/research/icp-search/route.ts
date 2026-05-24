import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { resolveCity } from '@/lib/geocode'
import type { ParsedFilters } from '../icp-parse/route'

const LUSHA_API_KEY = process.env.LUSHA_API_KEY
const LUSHA_SEARCH_URL = 'https://api.lusha.com/prospecting/contact/search'
const MAX_PER_COMPANY_DEFAULT = 3
const MAX_RESULTS_DEFAULT = 25

export interface SearchResult {
  contactId: string
  personId: number
  name: string
  jobTitle: string
  companyName: string
  companyId: number
  fqdn: string
  companyDescription: string
  logoUrl: string
  location: string
  hasEmail: boolean
  hasPhone: boolean
  hasMobilePhone: boolean
  hasDirectPhone: boolean
  hasLinkedIn: boolean
}

export interface ICPSearchResponse {
  results: SearchResult[]
  totalResults: number
  creditsCharged: number
  appliedFilters: ParsedFilters
}

async function buildLushaBody(filters: ParsedFilters, page: number, size: number) {
  const contactInclude: Record<string, unknown> = {}
  const companiesInclude: Record<string, unknown> = {}

  // When seniority already covers the intent (e.g. Founder), don't also send
  // the same word as a jobTitle — the AND condition makes it too restrictive
  const seniorityLabels = new Set((filters.seniorities ?? []).map(s => s.toLowerCase()))
  const filteredJobTitles = filters.jobTitles.filter(
    t => !seniorityLabels.has(t.toLowerCase())
  )
  if (filteredJobTitles.length > 0) contactInclude.jobTitles = filteredJobTitles
  if (filters.departments.length > 0) contactInclude.departments = filters.departments
  if (filters.seniorityIds.length > 0) contactInclude.seniority = filters.seniorityIds.map(Number)

  // Lusha expects locations as separate objects: [{country: "India"}, {city: "Bengaluru"}]
  // NOT combined: [{country: "India", city: "Bengaluru"}]
  if (filters.locations.length > 0) {
    const lushaLocations: Array<Record<string, string>> = []
    for (const loc of filters.locations) {
      // Skip country-only locations — Lusha returns 500 for some countries like India
      // Cities are more reliable and specific
      if (loc.city) lushaLocations.push({ city: await resolveCity(loc.city) })
      else if (loc.country) lushaLocations.push({ country: loc.country })
    }
    if (lushaLocations.length > 0) contactInclude.locations = lushaLocations
  }

  if (filters.companyNames.length > 0) {
    const domains = filters.companyNames.filter(c => c.includes('.'))
    const names = filters.companyNames.filter(c => !c.includes('.'))
    if (domains.length > 0) companiesInclude.domains = domains
    if (names.length > 0) companiesInclude.names = names
  }

  if (filters.companySizes.length > 0) {
    companiesInclude.sizes = filters.companySizes
  }

  const lushaFilters: Record<string, unknown> = {
    contacts: { include: contactInclude },
  }

  // Only add companies filter when there are actual company constraints
  // Lusha returns 400 if companies.include is empty
  if (Object.keys(companiesInclude).length > 0) {
    lushaFilters.companies = { include: companiesInclude }
  }

  return {
    pages: { page, size },
    filters: lushaFilters,
  }
}

function dedupeByCompany(results: SearchResult[], maxPerCompany: number): SearchResult[] {
  const companyCount: Record<string, number> = {}
  return results.filter(r => {
    const key = r.companyName?.toLowerCase() ?? 'unknown'
    companyCount[key] = (companyCount[key] ?? 0) + 1
    return companyCount[key] <= maxPerCompany
  })
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  let body: {
    filters: ParsedFilters
    limit?: number
    maxPerCompany?: number
    page?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.filters) {
    return NextResponse.json({ error: 'filters is required' }, { status: 400 })
  }

  const limit = Math.min(body.limit ?? MAX_RESULTS_DEFAULT, 50)
  const maxPerCompany = body.maxPerCompany ?? MAX_PER_COMPANY_DEFAULT
  const page = body.page ?? 0
  // Fetch more than needed so we can apply per-company deduplication and still fill the limit
  const fetchSize = Math.min(limit * 2, 50)

  if (!LUSHA_API_KEY) {
    // Return mock data when no API key
    return NextResponse.json({
      results: getMockResults(limit),
      totalResults: 2400,
      creditsCharged: 0,
      appliedFilters: body.filters,
    } satisfies ICPSearchResponse)
  }

  const lushaBody = await buildLushaBody(body.filters, page, fetchSize)

  let res: Response
  try {
    res = await fetch(LUSHA_SEARCH_URL, {
      method: 'POST',
      headers: {
        'api_key': LUSHA_API_KEY,
        'Content-Type': 'application/json',
        'Connection': 'close',
      },
      body: JSON.stringify(lushaBody),
    })
  } catch (err) {
    console.error('[icp-search] Lusha network error:', err)
    return NextResponse.json({ error: 'Lusha API unreachable. Please try again.' }, { status: 503 })
  }

  if (!res.ok) {
    const errText = await res.text()
    console.error('[icp-search] Lusha error:', res.status, errText)
    if (res.status === 402) {
      return NextResponse.json(
        { error: 'Lusha credits exhausted. Please upgrade your Lusha account or add more credits.' },
        { status: 402 }
      )
    }
    return NextResponse.json({ error: 'Lusha search failed', detail: errText }, { status: res.status })
  }

  const json = await res.json() as {
    totalResults: number
    data: Array<Record<string, unknown>>
    billing?: { creditsCharged: number }
  }

  const rawResults: SearchResult[] = (json.data ?? []).map(c => ({
    contactId: String(c.contactId ?? ''),
    personId: Number(c.personId ?? 0),
    name: String(c.name ?? ''),
    jobTitle: String(c.jobTitle ?? ''),
    companyName: String(c.companyName ?? ''),
    companyId: Number(c.companyId ?? 0),
    fqdn: String(c.fqdn ?? ''),
    companyDescription: String(c.companyDescription ?? ''),
    logoUrl: String(c.logoUrl ?? ''),
    hasEmail: Boolean(c.hasEmails),
    hasPhone: Boolean(c.hasPhones),
    hasMobilePhone: Boolean(c.hasMobilePhone),
    hasDirectPhone: Boolean(c.hasDirectPhone),
    hasLinkedIn: Boolean(c.hasSocialLink),
    location: [c.city, c.country].filter(Boolean).map(String).join(', '),
  }))

  const deduped = dedupeByCompany(rawResults, maxPerCompany).slice(0, limit)

  return NextResponse.json({
    results: deduped,
    totalResults: json.totalResults ?? 0,
    creditsCharged: json.billing?.creditsCharged ?? 0,
    appliedFilters: body.filters,
  } satisfies ICPSearchResponse)
}

function getMockResults(count: number): SearchResult[] {
  const mocks = [
    { name: 'Rahul Sharma', jobTitle: 'Head of Collections', companyName: 'HDFC Bank', fqdn: 'hdfcbank.com' },
    { name: 'Priya Nair', jobTitle: 'Collection Head', companyName: 'SBI', fqdn: 'sbi.co.in' },
    { name: 'Amit Kumar', jobTitle: 'Collections Head', companyName: 'ICICI Bank', fqdn: 'icicibank.com' },
    { name: 'Deepika Menon', jobTitle: 'VP Collections', companyName: 'Axis Bank', fqdn: 'axisbank.com' },
    { name: 'Suresh Patel', jobTitle: 'Head of Recovery', companyName: 'Kotak Mahindra Bank', fqdn: 'kotak.com' },
  ]
  return Array.from({ length: Math.min(count, mocks.length) }, (_, i) => ({
    contactId: `mock_${i}`,
    personId: i + 1000,
    name: mocks[i].name,
    jobTitle: mocks[i].jobTitle,
    companyName: mocks[i].companyName,
    companyId: i + 1,
    fqdn: mocks[i].fqdn,
    companyDescription: '',
    logoUrl: '',
    location: i % 2 === 0 ? 'Bengaluru, India' : 'Mumbai, India',
    hasEmail: true,
    hasPhone: i % 2 === 0,
    hasMobilePhone: i % 2 === 0,
    hasDirectPhone: i % 3 === 0,
    hasLinkedIn: true,
  }))
}
