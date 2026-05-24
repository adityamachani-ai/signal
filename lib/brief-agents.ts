import { getLlm, BRIEF_MODEL } from './llm'
import type {
  EnrichmentContext,
  WhoTheyAre,
  PainMap,
  Angle,
  WhyNow,
  OutreachDrafts,
  CompanyBadge,
  EducationEntry,
} from './brief-types'

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface PlaybookContext {
  product_name?: string | null
  problem?: string | null
  for_who?: string | null
  different?: string | null
  value_props?: unknown
  competitors?: unknown
  tone?: unknown
  never_use?: unknown
}

interface LeadContext {
  full_name: string
  job_title?: string | null
  company_name?: string | null
  company_domain?: string | null
}

function enrichmentSummary(ctx: EnrichmentContext): string {
  const parts: string[] = []

  if (!ctx.person) {
    parts.push(`=== LINKEDIN PROFILE ===\n⚠️ Profile scrape unavailable — no structured career data. Reconstruct the career arc using RECENT LINKEDIN POSTS and WEB SEARCH RESULTS below only. Prefer the most recent web sources to determine the current role.`)
  }

  if (ctx.person) {
    const p = ctx.person as Record<string, unknown>
    const positions = (Array.isArray(p.experience) ? (p.experience as unknown[]) : [])
      .map((pos: unknown) => {
        const r = pos as Record<string, unknown>
        const endDate = r.endDate as Record<string, unknown> | null | undefined
        return {
          title: r.position,
          company: r.companyName,
          current: endDate?.text === 'Present',
          dates: [(r.startDate as Record<string, unknown> | undefined)?.text, endDate?.text].filter(Boolean).join(' – '),
          description: typeof r.description === 'string' && r.description
            ? r.description.slice(0, 300)
            : undefined,
        }
      })
    const education = (Array.isArray(p.education) ? (p.education as unknown[]) : [])
      .map((edu: unknown) => {
        const e = edu as Record<string, unknown>
        return {
          school: e.schoolName,
          degree: [e.degree, e.fieldOfStudy].filter(Boolean).join(', '),
          years: [
            (e.startDate as Record<string, unknown> | undefined)?.year,
            (e.endDate as Record<string, unknown> | undefined)?.year,
          ].filter(Boolean).join(' – '),
        }
      })
    parts.push(`=== LINKEDIN PROFILE ===\n${JSON.stringify({
      headline: p.headline,
      summary: typeof p.about === 'string' ? p.about.slice(0, 500) : undefined,
      location: p.location,
      connections: p.connectionsCount,
      followers: p.followerCount,
      positions,
      education: education.length ? education : undefined,
      skills: (Array.isArray(p.skills) ? (p.skills as unknown[]).slice(0, 12) : [])
        .map((s: unknown) => (s as Record<string, unknown>).name),
    }, null, 2)}`)
  }
  if (ctx.company) {
    const c = ctx.company as Record<string, unknown>
    parts.push(`=== COMPANY DATA ===\n${JSON.stringify({
      name: c.name,
      tagline: c.tagline,
      description: typeof c.description === 'string' ? c.description.slice(0, 600) : c.description,
      employeeCount: c.employeeCount,
      employeeCountRange: c.employeeCountRange,
      companyType: c.companyType,
      industries: c.industries,
      specialities: Array.isArray(c.specialities) ? (c.specialities as string[]).slice(0, 5) : c.specialities,
      foundedOn: c.foundedOn,
      locations: Array.isArray(c.locations) ? (c.locations as unknown[]).slice(0, 3) : c.locations,
      fundingData: c.fundingData,
    }, null, 2)}`)
  }
  if (ctx.posts.length) {
    parts.push(`=== RECENT LINKEDIN POSTS ===\n${JSON.stringify(
      ctx.posts
        .filter((p) => p.content && p.content.trim())
        .slice(0, 20).map((p) => ({
        content: p.content,
        url: p.linkedinUrl,
        postedAt: p.postedAt?.postedAgoText,
        likes: p.engagement?.likes,
        comments: p.engagement?.comments,
      })), null, 2
    )}`)
  }
  if (ctx.webSearchResults.length) {
    const personName = ctx.person
      ? [`${(ctx.person as Record<string, unknown>).firstName ?? ''}`, `${(ctx.person as Record<string, unknown>).lastName ?? ''}`].join(' ').trim() || 'the prospect'
      : 'the prospect'
    const profileNote = ctx.person
      ? 'discard any result where the role, company, or industry does not match the LINKEDIN PROFILE above'
      : 'discard any result that does not clearly identify this specific person by name AND company/role'
    parts.push(`=== WEB SEARCH RESULTS ===
⚠️ CRITICAL: Verify each result below is about THIS specific person (${personName}) before citing it. Name collisions are common — ${profileNote}.
${JSON.stringify(
      ctx.webSearchResults.slice(0, 15).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 2000),
      })), null, 2
    )}`)
  }

  return parts.join('\n\n')
}

function playbookSummary(playbook: PlaybookContext): string {
  const vp = Array.isArray(playbook.value_props)
    ? (playbook.value_props as { outcome?: string; persona?: string }[])
        .map((v) => `- ${v.outcome ?? ''}${v.persona ? ` (for ${v.persona})` : ''}`)
        .join('\n')
    : String(playbook.value_props ?? 'Not specified')

  const comp = Array.isArray(playbook.competitors)
    ? (playbook.competitors as { name?: string; weakness?: string; angle?: string }[])
        .map((c) => `- ${c.name ?? ''}${c.weakness ? `: ${c.weakness}` : ''}`)
        .join('\n')
    : String(playbook.competitors ?? 'None')

  const tone = Array.isArray(playbook.tone)
    ? (playbook.tone as string[]).join(', ')
    : String(playbook.tone ?? 'Not specified')

  const neverUse = Array.isArray(playbook.never_use)
    ? (playbook.never_use as string[]).join(', ')
    : String(playbook.never_use ?? 'None')

  return `Product: ${playbook.product_name ?? 'Not specified'}
Problem we solve: ${playbook.problem ?? 'Not specified'}
For who: ${playbook.for_who ?? 'Not specified'}
Why different: ${playbook.different ?? 'Not specified'}
Value props:
${vp}
Competitors:
${comp}
Tone: ${tone}
Never use: ${neverUse}`
}

// ─── Eval token tracker (used by scripts/eval-brief.ts) ─────────────────────
export const _evalUsage = { inputTokens: 0, outputTokens: 0 }
export function _resetEvalUsage() { _evalUsage.inputTokens = 0; _evalUsage.outputTokens = 0 }

async function callLlm(systemPrompt: string, userPrompt: string, modelOverride?: string): Promise<string> {
  const llm = getLlm()
  const model = modelOverride ?? BRIEF_MODEL
  // gpt-5 family only supports temperature: 1 (the default); omit it for those models
  const supportsCustomTemp = !model.startsWith('gpt-5') && !model.startsWith('o')
  const response = await llm.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    ...(supportsCustomTemp ? { temperature: 0.3 } : {}),
    response_format: { type: 'json_object' },
  })
  if (response.usage) {
    _evalUsage.inputTokens += response.usage.prompt_tokens
    _evalUsage.outputTokens += response.usage.completion_tokens
  }
  return response.choices[0]?.message?.content ?? '{}'
}

// ─── 1. Who They Are ──────────────────────────────────────────────────────────

export async function generateWhoTheyAre(
  ctx: EnrichmentContext,
  lead: LeadContext,
  modelOverride?: string
): Promise<WhoTheyAre> {
  const system = `You are a sales intelligence analyst. Extract structured information about a prospect from raw enrichment data.
CRITICAL: Every field you populate must be directly traceable to the enrichment data. Omit or leave blank any field where you have no explicit evidence — do not guess or infer.
Always respond with valid JSON matching this TypeScript type:
{
  "headline": string,       // 1 sentence: who this person is (role + company + key context)
  "careerSummary": string,  // 2-3 sentence narrative of their career trajectory and what drove them here; weave in education background if relevant. Bold key phrases like **company names**, **years of experience**, and **domain expertise** using markdown.
  "arc": Array<{            // ordered recent-to-oldest, include all professional roles only (no education — education is handled separately)
    "role": string,         // job title
    "company": string,      // employer name
    "duration": string,     // e.g. "2023 – present" or "2 yrs"
    "note": string,         // 1 sentence from the role description; leave "" only if no description available
    "highlight": boolean    // true for the most recent (current) role only
  }>,
  "personalContext": string  // writing style, recurring themes, and interests observed ONLY from LinkedIn posts and LinkedIn profile — do NOT use web search results for this field; leave "" if no posts available
}`

  const user = `LEAD: ${lead.full_name}, ${lead.job_title ?? ''} at ${lead.company_name ?? ''}

ENRICHMENT DATA:
${enrichmentSummary(ctx)}

Extract the structured career intelligence. Focus on career arc, pivotal transitions, and personal context from posts.`

  const raw = await callLlm(system, user, modelOverride)
  const parsed = JSON.parse(raw) as WhoTheyAre

  // Attach companies + education from raw enrichment (not LLM-generated)
  if (ctx.person) {
    const p = ctx.person as Record<string, unknown>
    const experience = Array.isArray(p.experience) ? (p.experience as Record<string, unknown>[]) : []
    const education = Array.isArray(p.education) ? (p.education as Record<string, unknown>[]) : []

    // Deduplicated company badges with logos
    const seen = new Set<string>()
    const companies: CompanyBadge[] = []
    for (const exp of experience) {
      const name = String(exp.companyName ?? '')
      if (!name || seen.has(name)) continue
      seen.add(name)
      const logo = (exp.companyLogo as Record<string, unknown> | undefined)?.url
      companies.push({ name, logo: typeof logo === 'string' && logo ? logo : undefined })
    }
    parsed.companies = companies

    // Attach company logos to arc items
    const logoMap = new Map(companies.filter(c => c.logo).map(c => [c.name, c.logo!]))
    for (const step of parsed.arc) {
      if (!step.companyLogo && logoMap.has(step.company)) {
        step.companyLogo = logoMap.get(step.company)
      }
    }

    // Education entries
    parsed.education = education.map((e) => {
      const schoolLogo = (e.schoolLogo as Record<string, unknown> | undefined)?.url
      return {
        school: String(e.schoolName ?? ''),
        degree: [e.degree, e.fieldOfStudy].filter(Boolean).map(String).join(', '),
        years: [
          (e.startDate as Record<string, unknown> | undefined)?.year,
          (e.endDate as Record<string, unknown> | undefined)?.year,
        ].filter(Boolean).join(' – '),
        schoolLogo: typeof schoolLogo === 'string' && schoolLogo ? schoolLogo : undefined,
      }
    })
  }

  return parsed
}

// ─── 2. Pain Map ──────────────────────────────────────────────────────────────

export async function generatePainMap(
  ctx: EnrichmentContext,
  lead: LeadContext,
  playbook: PlaybookContext,
  modelOverride?: string
): Promise<PainMap> {
  const system = `You are a sales intelligence analyst. The seller already knows who their ICP is — your job is NOT to discover whether this person has problems, but to confirm WHICH variant is most acute and find evidence that makes it actionable for a sales rep.

REASONING FRAMEWORK — work through three layers before writing any pain:

LAYER 1 — ROLE-LEVEL BASELINE (always present, no enrichment needed):
The seller's playbook defines the problem their ICP faces. This person IS the ICP. The problems from "Problem we solve" and value props exist by default for anyone in this role at this type of company — assume them without requiring enrichment proof. Identify which ones apply based on role and company type alone.

LAYER 2 — COMPANY AMPLIFIERS (from enrichment data):
Scan all enrichment sources for signals that make a Layer 1 pain MORE ACUTE or TIME-SENSITIVE right now:
- Regulatory fines, compliance actions, or audit findings that affect their function
- Rapid headcount growth or contraction putting operational strain on their team
- M&A, restructuring, or new leadership creating instability or urgent re-prioritisation
- Industry-wide enforcement deadlines or competitive events
- Public failures or press coverage tied to the exact problem the seller solves

LAYER 3 — INDIVIDUAL SIGNALS (from enrichment data):
Scan all enrichment sources for signals that reveal WHICH variant of the pain is most top-of-mind for THIS person:
- Their own posts or interview/podcast quotes referencing the problem directly
- Conference talk topics they chose (signals active exploration — not a solved problem)
- Career trajectory that placed this pain squarely in their ownership

PAIN SELECTION RULES:
1. Layer 2 or 3 evidence found → include that pain; use the enrichment fact as keyProof
2. Layer 1 only, no amplifying data → DO NOT include it; omit rather than return a generic role-level statement
3. Signal in enrichment OUTSIDE the playbook's problem space → include only if exceptional (regulatory fine directly naming their function, their own verbatim quote about the problem)
4. NEVER fabricate Layer 2 or Layer 3 evidence to make a Layer 1 pain appear more specific than it is

EVIDENCE RULES (non-negotiable):
1. Every evidence item and keyProof for Layer 2/3 pains must cite something VERBATIM from the enrichment data — an exact phrase, a specific job title, a concrete fact from a web article, or a company data point.
2. If you quote text (using single quotes), it MUST be a word-for-word excerpt that appears in the enrichment data. Do NOT paraphrase and present it as a quote.
3. Never use "likely", "probably", "indicates", "suggests" in Layer 2/3 pains or evidence. Layer 1 pains may state structural role truths (e.g. "All [role] at [company type] must manage X") but must be flagged as role-level in keyProof.
4. Return fewer pains rather than padding — 1-2 amplified pains beats 4 pains with fabricated citations.
5. Speaker announcements and event invitations are NOT evidence of a pain — they only prove the person is active in that space. Do not cite "announced as speaker at X" as proof of a specific problem.

PAIN FRAMING RULES:
- Write pain as a symptom or consequence — not a goal, desire, or need
- NEVER write pains as: "Need for...", "Requirement for...", "Lack of...", "Absence of..."
- The pain must be something a salesperson can raise on a call without being corrected
- USE INDIRECT SIGNALS: conference topic → exploring but not solved; regulatory fine → direct heat on their function; career move → pain is now their ownership

How to derive pain from different data types:

From a regulatory/compliance post (e.g. 'All Fintechs need to adapt 1600 series... By Feb 1st you need to be migrating to avoid penalties'):
  → BAD: "Need for compliant telecalling infrastructure"
  → GOOD: "TRAI 1600-series migration is a live fire drill — every service and transactional call needs to move, with penalties starting Feb 1st"

From conference appearances (e.g. spoke at BharatC about 'AI revolutionizing collection strategies'):
  → BAD: "Need for AI-powered collection automation"
  → GOOD: "Kissht is publicly exploring AI for collections — Vivek spoke about it at BharatC — but hasn't announced a deployed solution, still in build-vs-buy phase"

From a company article (e.g. 'one of the biggest challenges was building trust' + serving 'Tier 2 and Tier 3 cities'):
  → BAD: "Challenges in building trust with borrowers"
  → GOOD: "Kissht serves Tier 2/3 borrowers where trust in digital lending is low — every collections touchpoint that feels impersonal erodes the brand they spent years building"

From career progression (e.g. moved from Head of Collection Analytics → COO in 3 years):
  → BAD: "Operational scaling challenges"
  → GOOD: "Vivek went from running collection analytics to owning all ops as COO — collections, credit, risk all under one person signals the org is scaling faster than it can specialize"

Always respond with valid JSON matching this TypeScript type:
{
  "observations": string[],  // FIRST — label each with [L1] for role/playbook baseline assumptions, [L2] for company amplifiers found in enrichment, [L3] for individual signals found in enrichment. List every notable quote, fact, regulatory event, fine, metric, or signal. One item per fact. Cover every web result, every post, the company profile, and the LinkedIn profile. Do not skip any source.
  "items": Array<{
    "pain": string,           // 1 sharp sentence: the symptom or consequence the prospect feels today — written from their perspective, NOT yours. NEVER start with "Role-level:" or any analyst label. Always a plain statement, e.g. "HDFC's collections function has been fined twice by RBI in 14 months for falling below standards" or "Kissht is publicly exploring AI for collections but hasn't deployed a solution yet"
    "keyProof": string,       // format as "'exact words' — [source title](url)" using a markdown link when the source has a URL. For sources without a URL (LinkedIn profile, company profile): "'exact words' — LinkedIn company profile"
    "evidence": string[],     // 2-4 items; when citing a web article or LinkedIn post that has a URL, append a markdown link — "verbatim fact — [source title](url)". For L1-only pains, explain structurally why this role/company type has this problem
    "valuePropMatch": string  // which of the seller's value props or outcomes this maps to (used for outreach generation)
  }>,
  "topPain": string           // exact copy of item.pain with the strongest evidence layer — prefer L2/L3 amplified pains over L1-only
}`

  const user = `LEAD: ${lead.full_name}, ${lead.job_title ?? ''} at ${lead.company_name ?? ''}

SELLER'S PLAYBOOK:
${playbookSummary(playbook)}

ENRICHMENT DATA:
${enrichmentSummary(ctx)}

Work through all three layers. This person IS the seller's ICP — start from the playbook's baseline problems, then find Layer 2 or Layer 3 evidence in the enrichment data that makes those problems specific and actionable.

IMPORTANT: Only include a pain if it has at least one of:
- A Layer 2 company amplifier (regulatory fine, growth signal, public failure, compliance event), OR
- A Layer 3 individual signal (their own quote, conference topic, career move)

If there is no L2 or L3 evidence for a pain, do NOT include it — a bare role-level statement is not actionable for a sales rep and must be omitted. Return an empty "items" array and empty "topPain" if the enrichment data contains no real amplifying signals. An empty result is more honest and useful than a generic ICP restatement.`

  const raw = await callLlm(system, user, modelOverride)
  const parsed = JSON.parse(raw) as PainMap & { observations?: string[] }
  delete parsed.observations
  return parsed as PainMap
}

// ─── 3. Angle ─────────────────────────────────────────────────────────────────

export async function generateAngle(
  ctx: EnrichmentContext,
  lead: LeadContext,
  playbook: PlaybookContext,
  modelOverride?: string
): Promise<Angle> {
  const system = `You are a top B2B sales strategist. Given all the research on a prospect, determine THE ONE best angle to lead with.
CRITICAL: Base the angle strictly on evidence present in the enrichment data. Do not invent timing events, funding rounds, or other facts not explicitly stated.
Always respond with valid JSON matching this TypeScript type:
{
  "headline": string,     // "Lead with X" — 1 crisp sentence telling the sales rep exactly what to open with
  "reasoning": string,    // 2-3 sentences explaining why this is the right angle given timing, pain, and context
  "confidence": "low" | "medium" | "high",
  "sources": string[]     // list of source types that support this angle, e.g. ["linkedin_post", "company_funding", "web_news"]
}`

  const user = `LEAD: ${lead.full_name}, ${lead.job_title ?? ''} at ${lead.company_name ?? ''}

SELLER'S PLAYBOOK:
${playbookSummary(playbook)}

ENRICHMENT DATA:
${enrichmentSummary(ctx)}

What is THE ONE angle to lead with? Consider timing signals, their stated pains, and the seller's strongest differentiators.`

  const raw = await callLlm(system, user, modelOverride)
  return JSON.parse(raw) as Angle
}

// ─── 4. Why Now ───────────────────────────────────────────────────────────────

export async function generateWhyNow(
  ctx: EnrichmentContext,
  lead: LeadContext,
  playbook: PlaybookContext,
  modelOverride?: string
): Promise<WhyNow> {
  const system = `You are a sales intelligence analyst. Extract timing signals that make now the right moment to reach out — specifically for THIS seller's product.

A signal qualifies only if it connects to why the prospect needs the seller's product right now. For each signal, you should be able to complete: "This matters because the prospect [has problem X / is in state Y] that the seller solves."

CRITICAL: Base every signal strictly on evidence explicitly present in the enrichment data. Do not infer funding rounds, job changes, or other events that are not stated. If fewer than 3 strong signals exist, return fewer rather than padding with weak or invented ones.

Always respond with valid JSON matching this TypeScript type:
{
  "observations": string[],  // FIRST — scan ALL data sources exhaustively and list every notable event, date, regulatory action, fine, job change, post topic, or company fact. One item per fact. Cover every web result, every post, the company profile, and the LinkedIn profile. Do not skip any source.
  "signals": Array<{
    "text": string,    // short label, e.g. "Series B raised · $18M"
    "date": string,    // relative date, e.g. "6 weeks ago" or "3 months ago" or "Ongoing"
    "strong": boolean  // true if high-urgency and directly relevant to this product
  }>,
  "summary": string   // 1 sentence connecting the signals to urgency for THIS product
}`

  const user = `LEAD: ${lead.full_name}, ${lead.job_title ?? ''} at ${lead.company_name ?? ''}

SELLER'S PLAYBOOK:
${playbookSummary(playbook)}

ENRICHMENT DATA:
${enrichmentSummary(ctx)}

Extract 3-6 timing signals relevant to this seller's product. Strong signals: job change relevant to buyer persona, explicit post about the pain, hiring patterns that signal the problem, company growth into ICP.`

  const raw = await callLlm(system, user, modelOverride)
  const parsed = JSON.parse(raw) as WhyNow & { observations?: string[] }
  delete parsed.observations
  return parsed as WhyNow
}

// ─── 5. Outreach Drafts ───────────────────────────────────────────────────────

export async function generateOutreachDrafts(
  ctx: EnrichmentContext,
  lead: LeadContext,
  playbook: PlaybookContext,
  angle: Angle,
  painMap: PainMap,
  whyNow: WhyNow,
  modelOverride?: string
): Promise<OutreachDrafts> {
  const tone = Array.isArray(playbook.tone)
    ? (playbook.tone as string[]).join(', ')
    : String(playbook.tone ?? 'conversational, direct')

  const neverUse = Array.isArray(playbook.never_use)
    ? (playbook.never_use as string[]).join(', ')
    : String(playbook.never_use ?? '')

  const system = `You are a world-class B2B outreach copywriter. Write 5 outreach messages for a sales rep based on research and the playbook's angle.

TONE: ${tone}
NEVER USE: ${neverUse || 'nothing specified'}

CRITICAL: Ground every personalisation in the enrichment data or the provided pain map / timing signals. Do not add facts, metrics, or anecdotes that are not present in the data.

BANNED OPENER PHRASES — never start any message with these:
- "I've been following your insights / work / posts / journey"
- "I came across your profile"
- "Hope this finds you well"
- "Just wanted to follow up"
- "I wanted to quickly / briefly share / tell you about"
- Any variation of "I thought you might be interested in"

Rules per channel:
- linkedin-note: max 300 characters. Reference one specific fact about them (a post topic, a regulatory event they wrote about, their role) — not a generic compliment.
- linkedin-dm: 3-5 sentences, warm but direct. MUST open by quoting the prospect's own words back — e.g. "You wrote that '[exact quote from their post]' — that framing is exactly why I'm reaching out." Do NOT open with a banned phrase or a generic compliment.
- email: max 150 words total. Return as a SINGLE STRING formatted as: "Subject: [subject line]\n\n[body text]" — do NOT return a JSON object with separate subject and body fields. Specific hook in subject line, clear CTA at the end.
- follow-up: 2-3 sentences. Must come from a DIFFERENT angle or pain than the linkedin-dm — if the DM led with regulatory pressure, the follow-up leads with a different signal (e.g. early borrower engagement or automation vs. human judgment). Do NOT start with "Just wanted to follow up" or repeat the same hook.
- call-opener: 2-3 sentences. MUST open with something about THEM — a fact, their own quote, or a recent event — before mentioning your product. Do not start with "I wanted to share / explain."

Always respond with valid JSON matching this type:
{
  "linkedin-note": string,
  "linkedin-dm": string,
  "email": string,    // SINGLE string: "Subject: [line]\n\n[body]" — NOT a JSON object
  "follow-up": string,
  "call-opener": string
}`

  const user = `LEAD: ${lead.full_name}, ${lead.job_title ?? ''} at ${lead.company_name ?? ''}

ANGLE TO LEAD WITH: ${angle.headline}
ANGLE REASONING: ${angle.reasoning}

TOP PAIN POINTS:
${JSON.stringify(painMap.items, null, 2)}

TIMING SIGNALS (Why Now):
${JSON.stringify(whyNow.signals, null, 2)}

SELLER'S PLAYBOOK:
${playbookSummary(playbook)}

ENRICHMENT DATA:
${enrichmentSummary(ctx)}

Write 5 personalised outreach messages. Each must feel like it was written specifically for this person — not a template.`

  const raw = await callLlm(system, user, modelOverride)
  return JSON.parse(raw) as OutreachDrafts
}
