// ─── Raw data returned by Apify / Tavily ─────────────────────────────────────

export interface LinkedInPersonData {
  // from harvestapi~linkedin-profile-scraper
  publicIdentifier?: string
  linkedinUrl?: string
  firstName?: string
  lastName?: string
  headline?: string
  summary?: string
  location?: string
  positions?: Array<{
    title?: string
    companyName?: string
    description?: string
    startDate?: { month?: number; year?: number }
    endDate?: { month?: number; year?: number } | null
    isCurrent?: boolean
  }>
  skills?: Array<{ name?: string }>
  education?: Array<{
    schoolName?: string
    degreeName?: string
    fieldOfStudy?: string
    startDate?: { year?: number }
    endDate?: { year?: number }
  }>
  connections?: number
  followers?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface LinkedInCompanyData {
  // from harvestapi~linkedin-company
  id?: string
  universalName?: string
  linkedinUrl?: string
  name?: string
  tagline?: string
  website?: string
  description?: string
  foundedOn?: { year?: number }
  employeeCount?: number
  employeeCountRange?: { start?: number; end?: number }
  followerCount?: number
  companyType?: string
  industries?: string[]
  specialities?: string[]
  locations?: Array<{
    country?: string
    city?: string
    headquarter?: boolean
  }>
  fundingData?: {
    numFundingRounds?: number
    lastFundingRound?: {
      fundingType?: string
      moneyRaised?: { currencyCode?: string; amount?: string }
      announcedOn?: { month?: number; day?: number; year?: number }
      leadInvestors?: Array<{ name?: string }>
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface LinkedInPost {
  // from harvestapi~linkedin-profile-posts
  type?: string
  id?: string
  linkedinUrl?: string
  content?: string
  postedAt?: { date?: string; postedAgoText?: string }
  engagement?: { likes?: number; comments?: number; shares?: number }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface WebSearchResult {
  title?: string
  url?: string
  content?: string
  score?: number
}

// ─── Enrichment context — all raw data from the research agent ────────────────

export interface EnrichmentContext {
  person: LinkedInPersonData | null
  company: LinkedInCompanyData | null
  posts: LinkedInPost[]
  webSearchResults: WebSearchResult[]
  toolCallLog: string[]  // short description of each tool call made
}

// ─── Structured brief sections produced by the 5 completion functions ─────────

export interface CareerStep {
  role: string
  company: string
  duration: string
  note?: string
  highlight?: boolean
  companyLogo?: string      // URL from Apify experience[].companyLogo.url
}

export interface EducationEntry {
  school: string
  degree: string            // e.g. "B.Tech, Computer Science" or "10 Standard"
  years: string             // e.g. "2018 – 2022"
  schoolLogo?: string       // URL from Apify education[].schoolLogo.url
}

export interface CompanyBadge {
  name: string
  logo?: string             // URL from Apify experience[].companyLogo.url
}

export interface WhoTheyAre {
  headline: string          // 1 sentence — who this person is
  careerSummary: string     // 2-3 sentence narrative
  arc: CareerStep[]         // ordered recent → oldest
  education?: EducationEntry[]  // separate education entries
  companies?: CompanyBadge[]    // deduplicated list of companies with logos (for company bar)
  personalContext?: string  // hobbies, side projects, interests from posts
}

export interface PainEvidence {
  pain: string              // symptom/consequence from the prospect's perspective
  keyProof: string          // single best evidence line — the rep's conversation hook
  evidence: string[]        // 2-4 specific evidence items (behind "Show reasoning")
  valuePropMatch: string    // which playbook value_prop this maps to (used by outreach gen, not rendered)
}

export interface PainMap {
  items: PainEvidence[]
  topPain: string           // the single most important pain label
}

export interface Angle {
  headline: string          // "Lead with X" — 1 sentence for the sales rep
  reasoning: string         // why this is the right angle — 2-3 sentences
  confidence: 'low' | 'medium' | 'high'
  sources: string[]         // e.g. ["linkedin_post", "company_data"]
}

export interface WhyNowSignal {
  text: string
  date: string
  strong: boolean
}

export interface WhyNow {
  signals: WhyNowSignal[]
  summary: string           // 1 sentence narrative
}

export type OutreachChannel = 'linkedin-note' | 'linkedin-dm' | 'email' | 'follow-up' | 'call-opener'

export type OutreachDrafts = Record<OutreachChannel, string>

// ─── Complete brief output ─────────────────────────────────────────────────────

export interface BriefOutput {
  whoTheyAre: WhoTheyAre
  painMap: PainMap
  angle: Angle
  whyNow: WhyNow
  outreachDrafts: OutreachDrafts
}

// ─── SSE event shapes ─────────────────────────────────────────────────────────

export type BriefSseEvent =
  | { type: 'research_start' }
  | { type: 'research_done'; toolCallLog: string[] }
  | { type: 'section'; section: 'who_they_are'; data: WhoTheyAre }
  | { type: 'section'; section: 'pain_map'; data: PainMap }
  | { type: 'section'; section: 'angle'; data: Angle }
  | { type: 'section'; section: 'why_now'; data: WhyNow }
  | { type: 'section'; section: 'outreach_drafts'; data: OutreachDrafts }
  | { type: 'done'; briefId: string }
  | { type: 'error'; message: string }
