// Lusha REST API client (v2/person endpoint)
// Single-contact enrichment uses GET with query string params.
// If LUSHA_API_KEY is not set, returns realistic mock data so the full UI flow
// works without consuming credits.

const LUSHA_API_KEY = process.env.LUSHA_API_KEY
const LUSHA_BASE_URL = 'https://api.lusha.com/v2/person'

export interface LushaContact {
  lushaId: string
  firstName: string
  lastName: string
  fullName: string
  jobTitle: string
  seniority: string
  department: string
  linkedinUrl: string
  companyName: string
  companyDomain: string
  companySizeRange: string
  companyIndustry: string
  companyLocation: string
  city: string
  country: string
  emails: string[]
  phones: string[]
  rawPayload: Record<string, unknown>
}

export type LookupInput =
  | { type: 'linkedin'; linkedinUrl: string }
  | { type: 'email'; email: string }
  | { type: 'name'; firstName: string; lastName: string; company: string }

// ─── Typed error ──────────────────────────────────────────────────────────────

export class LushaApiError extends Error {
  constructor(public code: 'RATE_LIMIT' | 'API_ERROR', message: string) {
    super(message)
    this.name = 'LushaApiError'
  }
}

// ─── REST API call (GET + query string) ───────────────────────────────────────

async function callLushaGet(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${LUSHA_BASE_URL}?${qs}`, {
    method: 'GET',
    headers: { 'api_key': LUSHA_API_KEY! },
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[lusha] API error ${res.status}:`, errText)
    if (res.status === 429) {
      throw new LushaApiError('RATE_LIMIT', 'Lusha API rate limit reached. Please wait and try again.')
    }
    return null
  }

  const json = await res.json() as { contact: { data: Record<string, unknown> | null; error: unknown } }
  return json.contact?.data ?? null
}

// ─── Response mapper ──────────────────────────────────────────────────────────
// GET /v2/person response shape:
//   contact.data.firstName, lastName, fullName
//   contact.data.jobTitle: { title, departments, seniority }
//   contact.data.location: { city, country, ... }
//   contact.data.emailAddresses: [{ email, emailType, ... }]
//   contact.data.phoneNumbers: [{ number, phoneType, ... }]
//   contact.data.socialLinks: { linkedin }
//   contact.data.company: { name, domains: { homepage }, companySize: [min, max], mainIndustry, location }

function mapResponse(data: Record<string, unknown>): LushaContact {
  const jobTitleObj    = (data.jobTitle    ?? {}) as Record<string, unknown>
  const location       = (data.location   ?? {}) as Record<string, unknown>
  const company        = (data.company    ?? {}) as Record<string, unknown>
  const companyDomains = (company.domains ?? {}) as Record<string, unknown>
  const companySize    = (company.companySize ?? []) as number[]
  const companyLoc     = (company.location   ?? {}) as Record<string, unknown>
  const socialLinks    = (data.socialLinks   ?? {}) as Record<string, unknown>

  const emails = ((data.emailAddresses ?? []) as Record<string, unknown>[])
    .map(e => String(e.email ?? '')).filter(Boolean)

  const phones = ((data.phoneNumbers ?? []) as Record<string, unknown>[])
    .map(p => String(p.number ?? '')).filter(Boolean)

  const sizeRange = companySize.length === 2 ? `${companySize[0]}-${companySize[1]}` : ''
  const companyLocationStr = [companyLoc.city, companyLoc.country].filter(Boolean).join(', ')

  return {
    lushaId:          String(data.personId ?? data.id ?? ''),
    firstName:        String(data.firstName ?? ''),
    lastName:         String(data.lastName  ?? ''),
    fullName:         String(data.fullName  ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`).trim(),
    jobTitle:         String(jobTitleObj.title ?? ''),
    seniority:        String(jobTitleObj.seniority ?? '').toLowerCase(),
    department:       ((jobTitleObj.departments ?? []) as string[])[0] ?? '',
    linkedinUrl:      String(socialLinks.linkedin ?? ''),
    companyName:      String(company.name ?? ''),
    companyDomain:    String(companyDomains.homepage ?? companyDomains.email ?? ''),
    companySizeRange: sizeRange,
    companyIndustry:  String(company.mainIndustry ?? company.subIndustry ?? ''),
    companyLocation:  companyLocationStr,
    city:             String(location.city    ?? ''),
    country:          String(location.country ?? ''),
    emails,
    phones,
    rawPayload: data,
  }
}

// ─── Public lookup function ───────────────────────────────────────────────────

export async function lookupContact(input: LookupInput): Promise<LushaContact | null> {
  if (!LUSHA_API_KEY) return getMockContact(input)

  let data: Record<string, unknown> | null = null

  if (input.type === 'linkedin') {
    data = await callLushaGet({ linkedinUrl: input.linkedinUrl })
  } else if (input.type === 'email') {
    data = await callLushaGet({ email: input.email })
  } else {
    data = await callLushaGet({
      firstName:   input.firstName.trim(),
      lastName:    input.lastName.trim(),
      companyName: input.company.trim(),
    })
  }

  return data ? mapResponse(data) : null
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function getMockContact(input: LookupInput): LushaContact {
  const base = {
    lushaId:          `mock_${Date.now()}`,
    jobTitle:         'VP of Sales',
    seniority:        'vp',
    department:       'Sales',
    companyDomain:    'acmecorp.in',
    companySizeRange: '51-200',
    companyIndustry:  'Computer Software',
    companyLocation:  'Bengaluru, India',
    city:             'Bengaluru',
    country:          'India',
    emails:           [],
    phones:           [],
    rawPayload:       { mock: true },
  }

  if (input.type === 'linkedin') {
    const slug  = input.linkedinUrl.split('/in/')[1]?.replace(/\/$/, '') ?? 'rahul-sharma'
    const parts = slug.split('-')
    const firstName = capitalise(parts[0] ?? 'Rahul')
    const lastName  = capitalise(parts[1] ?? 'Sharma')
    return { ...base, firstName, lastName, fullName: `${firstName} ${lastName}`, linkedinUrl: input.linkedinUrl, companyName: 'Acme Corp' }
  }

  if (input.type === 'email') {
    const [username, domain = 'acme.com'] = input.email.split('@')
    const parts     = username.split('.')
    const firstName = capitalise(parts[0] ?? 'Priya')
    const lastName  = capitalise(parts[1] ?? 'Mehta')
    return { ...base, firstName, lastName, fullName: `${firstName} ${lastName}`, linkedinUrl: '', companyDomain: domain, companyName: capitalise(domain.split('.')[0] ?? 'Acme') }
  }

  return { ...base, firstName: input.firstName, lastName: input.lastName, fullName: `${input.firstName} ${input.lastName}`.trim(), linkedinUrl: '', companyName: input.company }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

