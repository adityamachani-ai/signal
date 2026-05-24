import type OpenAI from 'openai'
import { getLlm, LLM_MODEL } from './llm'
import {
  apifyLinkedInPerson,
  apifyLinkedInCompany,
  apifyLinkedInPosts,
  tavilySearch,
} from './enrichment'
import type { EnrichmentContext } from './brief-types'

// ─── Lead + Playbook types (subset of DB rows) ────────────────────────────────

interface LeadForResearch {
  full_name: string
  job_title?: string | null
  company_name?: string | null
  linkedin_url?: string | null
  company_linkedin_url?: string | null
  company_domain?: string | null
  city?: string | null
  country?: string | null
}

interface PlaybookForResearch {
  product_name?: string | null
  problem?: string | null
  for_who?: string | null
  different?: string | null
  value_props?: unknown
  competitors?: unknown
  tone?: unknown
  never_use?: unknown
}

// ─── Tool definitions for OpenAI function calling ─────────────────────────────

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'linkedin_person',
      description:
        'Scrape a LinkedIn person profile to get career history, headline, summary, skills, and education.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full LinkedIn profile URL, e.g. https://www.linkedin.com/in/username' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'linkedin_company',
      description:
        "Scrape a LinkedIn company page to get the company's description, headcount, industry, locations, and funding data.",
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full LinkedIn company URL, e.g. https://www.linkedin.com/company/name' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'linkedin_posts',
      description:
        "Scrape the most recent posts from a LinkedIn person's profile to understand what they talk about, care about, and are currently dealing with.",
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full LinkedIn profile URL of the person' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the web for news, funding announcements, press releases, blog posts, or any other information about the person or their company.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Web search query string' },
        },
        required: ['query'],
      },
    },
  },
]

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(lead: LeadForResearch, playbook: PlaybookForResearch): string {
  const valueProps = Array.isArray(playbook.value_props)
    ? (playbook.value_props as { outcome?: string }[]).map((v) => v.outcome).filter(Boolean).join('; ')
    : String(playbook.value_props ?? '')

  const competitors = Array.isArray(playbook.competitors)
    ? (playbook.competitors as { name?: string }[]).map((c) => c.name).filter(Boolean).join(', ')
    : String(playbook.competitors ?? '')

  return `You are a world-class B2B sales research analyst. Your job is to gather ALL relevant intelligence about a sales prospect using the available tools, then stop.

PROSPECT
  Name: ${lead.full_name}
  Title: ${lead.job_title ?? 'Unknown'}
  Company: ${lead.company_name ?? 'Unknown'}
  LinkedIn: ${lead.linkedin_url ?? 'Not available'}
  Company LinkedIn: ${lead.company_linkedin_url ?? 'Not available'}
  Company domain: ${lead.company_domain ?? 'Unknown'}
  Location: ${[lead.city, lead.country].filter(Boolean).join(', ') || 'Unknown'}

SELLER'S PLAYBOOK
  Product: ${playbook.product_name ?? 'Not specified'}
  Problem we solve: ${playbook.problem ?? 'Not specified'}
  For who: ${playbook.for_who ?? 'Not specified'}
  Why we're different: ${playbook.different ?? 'Not specified'}
  Key outcomes: ${valueProps || 'Not specified'}
  Competitors: ${competitors || 'None listed'}

YOUR RESEARCH MANDATE — gather evidence for:
  (A) TIMING SIGNALS — recent job changes, funding, hiring spree, layoffs, product launches, public posts about pain
  (B) PAIN EVIDENCE — specific evidence that this person has the exact problems the seller solves; map to key outcomes
  (C) PERSONAL CONTEXT — career arc, communication style from posts, interests, what they care about
  (D) COMPANY CONTEXT — size, growth stage, tech sophistication, recent news
  (E) RELATIONSHIP HOOKS — shared interests, mutual connections, conversation starters
  (F) RED FLAGS — signs this might not be a good fit or bad timing

TOOL USAGE STRATEGY:
1. Always call linkedin_person if we have their LinkedIn URL
2. Always call linkedin_company if we have the company LinkedIn URL  
3. Always call linkedin_posts if we have their LinkedIn URL (to understand their voice and pain)
4. Always call web_search("${lead.full_name} ${lead.company_name}") to find any public presence — interviews, articles, talks, press mentions
5. Always call web_search with a query combining the person's name and the core pain from the playbook (e.g. "${lead.full_name} [2-3 keywords from the problem we solve]") — this surfaces whether they've publicly talked about or dealt with the exact pain the seller addresses
6. Use up to 3 more web_search calls for company/pain research — derive queries from the playbook problem and for_who:
   - Search for evidence that this prospect has the specific pain the seller solves, e.g. "${lead.company_name} [key problem keywords from playbook]"
   - Search for recent company news relevant to the pain, e.g. hiring patterns, leadership changes, product launches
   - Do NOT default to "funding series investors" unless the playbook problem is investment-related
7. You may call web_search up to 5 times total (2 person + up to 3 company/pain)

WEB SEARCH VERIFICATION: Before treating any web result as evidence, confirm it refers to THIS specific person (${lead.full_name}, ${lead.job_title ?? ''} at ${lead.company_name ?? ''}). Discard any result where the role, company, or industry does not match — name collisions are extremely common for non-public figures. Do not cite hobbies, research, or activities that don't match the person's known professional profile.

When you have collected sufficient data across all 6 categories, stop calling tools and respond with a brief confirmation that research is complete. Do NOT summarise the data — just confirm completion.`
}

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

interface ToolResults {
  person: Awaited<ReturnType<typeof apifyLinkedInPerson>>
  company: Awaited<ReturnType<typeof apifyLinkedInCompany>>
  posts: Awaited<ReturnType<typeof apifyLinkedInPosts>>
  webSearchResults: Array<Awaited<ReturnType<typeof tavilySearch>>[number]>
  toolCallLog: string[]
}

async function dispatchTool(
  name: string,
  args: Record<string, string>,
  state: ToolResults
): Promise<string> {
  switch (name) {
    case 'linkedin_person': {
      const data = await apifyLinkedInPerson(args.url)
      if (data !== null) state.person = data  // don't overwrite good data with a failed retry
      state.toolCallLog.push(`linkedin_person(${args.url})`)
      return JSON.stringify(data ?? { error: 'No data returned' })
    }
    case 'linkedin_company': {
      const data = await apifyLinkedInCompany(args.url)
      state.company = data
      state.toolCallLog.push(`linkedin_company(${args.url})`)
      return JSON.stringify(data ?? { error: 'No data returned' })
    }
    case 'linkedin_posts': {
      const data = await apifyLinkedInPosts(args.url)
      state.posts = data
      state.toolCallLog.push(`linkedin_posts(${args.url})`)
      return JSON.stringify(data.length ? data : { error: 'No posts found' })
    }
    case 'web_search': {
      const data = await tavilySearch(args.query)
      state.webSearchResults.push(...data)
      state.toolCallLog.push(`web_search("${args.query}")`)
      return JSON.stringify(data.length ? data : { error: 'No results' })
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ─── Main research agent ──────────────────────────────────────────────────────

export async function runResearchAgent(
  lead: LeadForResearch,
  playbook: PlaybookForResearch
): Promise<EnrichmentContext> {
  const llm = getLlm()
  const state: ToolResults = {
    person: null,
    company: null,
    posts: [],
    webSearchResults: [],
    toolCallLog: [],
  }

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(lead, playbook) },
    {
      role: 'user',
      content: `Please research ${lead.full_name} (${lead.job_title ?? ''} at ${lead.company_name ?? ''}) and gather all the intelligence described in your mandate.`,
    },
  ]

  const MAX_ITERATIONS = 12

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0,
    })

    const choice = response.choices[0]
    if (!choice) break

    messages.push(choice.message)

    // No more tool calls → agent is done
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      break
    }

    // Execute all tool calls in this turn (run in parallel for speed)
    const toolResults = await Promise.all(
      choice.message.tool_calls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments) as Record<string, string>
        const result = await dispatchTool(tc.function.name, args, state)
        return {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: result,
        }
      })
    )

    messages.push(...toolResults)
  }

  return {
    person: state.person,
    company: state.company,
    posts: state.posts,
    webSearchResults: state.webSearchResults,
    toolCallLog: state.toolCallLog,
  }
}
