import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getLlm, LLM_MODEL } from '@/lib/llm'
import {
  VALID_DEPARTMENTS, VALID_SENIORITIES, VALID_COUNTRIES,
  validateLlmResponse, fallbackParse,
  type ParsedFilters,
} from '@/lib/icp-filters'

export type { ParsedFilters }

const SYSTEM_PROMPT = `You are a B2B sales intelligence assistant. Parse a natural language query into structured filters for finding B2B contacts.

VALID DEPARTMENTS (use exact strings): ${VALID_DEPARTMENTS.join(', ')}
VALID SENIORITY LEVELS (use exact names): ${Object.keys(VALID_SENIORITIES).join(', ')}
VALID COUNTRIES (use exact strings): ${VALID_COUNTRIES.join(', ')}

Rules:
- jobTitles: free text array, max 5 variations of the most likely exact job titles.
- departments: MUST be from the valid list only.
- seniorities: MUST be from the valid list only.
- locations: array of { country?, city? }. Country must be from valid list.
- companyNames: extract any company mentioned. If user says "major/top/leading [industry]", list 5-8 well-known companies. Leave empty only when no companies are mentioned or implied.
- companySizes: array of { min, max } employee count. "startup"→{1,50}, "small"→{51,200}, "mid-size"→{201,1000}, "large/enterprise"→{1001,999999}.
- relatedRoles: 5-8 alternative job titles the user might also want. Real titles that appear on LinkedIn.
- notes: short strings explaining interpretations made.
- summary: short human-readable description of the search.

Return ONLY valid JSON:
{
  "jobTitles": string[], "departments": string[], "seniorities": string[],
  "locations": Array<{ country?: string, city?: string }>,
  "companyNames": string[], "companySizes": Array<{ min: number, max: number }>,
  "relatedRoles": string[], "notes": string[], "summary": string
}`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  let body: { query: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const query = body.query.trim()

  if (query.length > 2000) {
    return NextResponse.json({ error: 'Query too long (max 2000 characters)' }, { status: 400 })
  }

  let parsed: ParsedFilters | null = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const completion = await getLlm().chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800,
    }, { signal: controller.signal })

    clearTimeout(timeout)

    const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
    parsed = validateLlmResponse(raw, query)
  } catch (err) {
    console.warn('[icp-parse] LLM unavailable, using fallback:', (err as Error).message)
    parsed = fallbackParse(query)
  }

  if (
    parsed.jobTitles.length === 0 && parsed.departments.length === 0 &&
    parsed.seniorities.length === 0 && parsed.companyNames.length === 0
  ) {
    parsed.jobTitles = [query]
    parsed.notes.push('Could not extract specific filters — using full query as job title search')
  }

  return NextResponse.json({ filters: parsed })
}
