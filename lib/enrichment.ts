import type {
  LinkedInPersonData,
  LinkedInCompanyData,
  LinkedInPost,
  WebSearchResult,
} from './brief-types'

const APIFY_BASE = 'https://api.apify.com/v2/acts'
const APIFY_TIMEOUT_MS = 120_000  // 2 min — Apify sync runs can be slow

async function runApifyActor<T>(actorId: string, input: Record<string, unknown>): Promise<T[]> {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN
  if (!APIFY_TOKEN) throw new Error('APIFY_API_TOKEN is not set')

  const url = `${APIFY_BASE}/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(APIFY_TIMEOUT_MS),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Apify actor ${actorId} failed: ${res.status} ${text.slice(0, 200)}`)
  }

  return res.json() as Promise<T[]>
}

// ─── LinkedIn person profile ──────────────────────────────────────────────────

export async function apifyLinkedInPerson(profileUrl: string): Promise<LinkedInPersonData | null> {
  try {
    const results = await runApifyActor<LinkedInPersonData>(
      'harvestapi~linkedin-profile-scraper',
      { urls: [profileUrl] }
    )
    console.log(`[enrichment] linkedin_person raw: ${results.length} item(s) for ${profileUrl}`)
    if (results[0]) console.log('[enrichment] linkedin_person keys:', Object.keys(results[0]).join(', '))
    return results[0] ?? null
  } catch (err) {
    console.error('[enrichment] linkedin_person failed:', err)
    return null
  }
}

// ─── LinkedIn company ─────────────────────────────────────────────────────────

export async function apifyLinkedInCompany(
  companyLinkedInUrl: string
): Promise<LinkedInCompanyData | null> {
  try {
    const results = await runApifyActor<LinkedInCompanyData>(
      'harvestapi~linkedin-company',
      { companies: [companyLinkedInUrl] }
    )
    return results[0] ?? null
  } catch (err) {
    console.error('[enrichment] linkedin_company failed:', err)
    return null
  }
}

// ─── LinkedIn profile posts ───────────────────────────────────────────────────

export async function apifyLinkedInPosts(profileUrl: string): Promise<LinkedInPost[]> {
  try {
    const results = await runApifyActor<LinkedInPost>(
      'harvestapi~linkedin-profile-posts',
      {
        targetUrls: [profileUrl],
        maxPosts: 20,
        scrapeReactions: false,
        scrapeComments: false,
      }
    )
    return results
  } catch (err) {
    console.error('[enrichment] linkedin_posts failed:', err)
    return []
  }
}

// ─── Tavily web search ────────────────────────────────────────────────────────

export async function tavilySearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const TAVILY_KEY = process.env.TAVILY_API_KEY
  if (!TAVILY_KEY) throw new Error('TAVILY_API_KEY is not set')

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TAVILY_KEY}`,
      },
      body: JSON.stringify({ query, max_results: maxResults }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Tavily search failed: ${res.status} ${text.slice(0, 200)}`)
    }

    const data = await res.json() as { results?: WebSearchResult[] }
    return data.results ?? []
  } catch (err) {
    console.error('[enrichment] tavily_search failed:', err)
    return []
  }
}
