// Pure validation and fallback functions for ICP filter parsing.
// Separated from the route handler so they can be unit-tested directly.

// Valid Lusha filter values (sourced from Lusha n8n node)
export const VALID_DEPARTMENTS = [
  'Business Development', 'Consulting', 'Customer Service', 'Engineering & Technical',
  'Finance', 'General Management', 'Health Care & Medical', 'Human Resources',
  'Information Technology', 'Legal', 'Marketing', 'Operations', 'Other',
  'Product', 'Research & Analytics', 'Sales',
]

export const VALID_SENIORITIES: Record<string, string> = {
  'Founder': '10', 'Partner': '7', 'C-Suite': '9', 'Vice President': '8',
  'Director': '6', 'Manager': '5', 'Senior': '4', 'Entry': '3',
  'Intern': '2', 'Other': '1',
}

export const VALID_COUNTRIES = [
  'United States', 'India', 'United Kingdom', 'Brazil', 'Canada', 'Australia',
  'France', 'Germany', 'Netherlands', 'Italy', 'South Africa', 'Mexico',
  'Turkey', 'Sweden', 'China', 'Indonesia', 'Belgium', 'Spain',
  'United Arab Emirates', 'Argentina', 'Switzerland', 'Singapore', 'Saudi Arabia',
  'Ireland', 'Colombia', 'Chile', 'Malaysia', 'Egypt', 'Nigeria', 'Japan',
  'Hong Kong', 'Finland', 'Denmark', 'Taiwan', 'Bangladesh', 'Austria',
  'Czech Republic', 'Peru', 'Kenya', 'Vietnam', 'Poland', 'Ukraine', 'Thailand',
  'South Korea', 'New Zealand', 'Portugal',
]

export interface ParsedFilters {
  jobTitles: string[]
  departments: string[]
  seniorities: string[]
  locations: Array<{ country?: string; city?: string }>
  companyNames: string[]
  companySizes: Array<{ min: number; max: number }>
  relatedRoles: string[]
  notes: string[]
  summary: string
  seniorityIds: string[]
}

export function validateLlmResponse(raw: Record<string, unknown>, query: string): ParsedFilters {
  const seniorities = (asStringArray(raw.seniorities)).filter(s => s in VALID_SENIORITIES)
  return {
    jobTitles: asStringArray(raw.jobTitles).slice(0, 5),
    departments: asStringArray(raw.departments).filter(d => VALID_DEPARTMENTS.includes(d)),
    seniorities,
    locations: asLocationArray(raw.locations).filter(
      l => !l.country || VALID_COUNTRIES.includes(l.country)
    ),
    companyNames: asStringArray(raw.companyNames).slice(0, 8),
    companySizes: asSizeArray(raw.companySizes),
    relatedRoles: asStringArray(raw.relatedRoles).slice(0, 8),
    notes: asStringArray(raw.notes),
    summary: typeof raw.summary === 'string' ? raw.summary : query,
    seniorityIds: seniorities.map(s => VALID_SENIORITIES[s]),
  }
}

export function fallbackParse(query: string): ParsedFilters {
  return {
    jobTitles: [query],
    departments: [],
    seniorities: [],
    locations: [],
    companyNames: [],
    companySizes: [],
    relatedRoles: [],
    notes: ['LLM unavailable — using raw query as search'],
    summary: query,
    seniorityIds: [],
  }
}

function asStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : []
}

function asLocationArray(val: unknown): Array<{ country?: string; city?: string }> {
  if (!Array.isArray(val)) return []
  return val.filter(
    (v): v is { country?: string; city?: string } =>
      typeof v === 'object' && v !== null && (typeof v.country === 'string' || typeof v.city === 'string')
  )
}

function asSizeArray(val: unknown): Array<{ min: number; max: number }> {
  if (!Array.isArray(val)) return []
  return val.filter(
    (v): v is { min: number; max: number } =>
      typeof v === 'object' && v !== null && typeof v.min === 'number' && typeof v.max === 'number'
  )
}
