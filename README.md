# Signal

**Signal is a research and intelligence platform for B2B sales reps.** You tell it who you want to reach out to. It does the research. It tells you what's happening in that person's world right now, why today is a good or bad time to reach out, how that person communicates, what angle will resonate, and what to actually say.

The output is not a contact record or a data export — it's a **brief**: a structured intelligence document a rep reads in 2 minutes and acts on immediately, followed by a draft outreach message genuinely grounded in that specific person's situation.

---

## The Problem

Every B2B sales rep faces the same painful reality before reaching out to a prospect. They open LinkedIn, read the profile, Google the company, check for recent news, look for mutual connections — and 45 minutes later they have a mediocre email that still feels generic.

The tools that exist don't solve this. Apollo gives you a database. ZoomInfo gives you data. Clay gives technical teams a way to build enrichment workflows. None of them do the thinking. They hand the rep a pile of information and leave them to figure out what to do with it.

**That's the gap Signal fills.**

---

## The Core Insight

The best salespeople don't research harder — they research smarter. Timing is everything. The same message sent on the day a company raises a round lands 10x better than the same message sent three months later.

Signal operationalises this instinct at scale. It watches for the moments that matter — the funding announcement, the frustrated LinkedIn post, the surge in hiring, the leadership change — and tells the rep: **this is your window, this is why, this is what to say.**

---

## Who It's For

Sales reps and sales leaders at B2B SaaS companies, Series A through C. Teams of 3–25 reps. Companies scaling their outbound motion and feeling the quality problem — adding AEs, reply rates dropping, reps spending too much time on research or skipping it entirely.

---

## How It Works

1. **Find** — Paste a LinkedIn URL or email, describe who you're looking for (ICP discovery), or upload a CSV list.
2. **Add to list** — Select leads and add them to your active pipeline.
3. **Generate a brief** — Signal pulls data from multiple sources in parallel (contact DB, LinkedIn, Google News, job boards) and synthesises everything into a structured intelligence document with streaming output so the rep sees progress immediately.
4. **Read and understand** — The brief covers: who this person is, what their world looks like right now, why now is a good or bad time to reach out, how they communicate, what angle will resonate, what to avoid.
5. **Write and send** — Signal generates a draft outreach message grounded in the brief. Rep edits it, picks channel (LinkedIn, email, phone), sends.
6. **Keep watching** — Signal monitors every lead for new trigger events (funding, job change, competitor outage, etc.) and alerts the rep.

---

## What Makes It Different

- **Synthesises, not just aggregates.** Every other tool gives you data. Signal gives you understanding.
- **Built for reps, not RevOps.** Clay requires a GTM engineer. Signal opens every morning and tells you what to do.
- **Timing is the product.** The "Why Now" section of every brief is the most important thing on the page.
- **Gets smarter about your business.** The Playbook is where teams configure their ICP, value props, competitors, and communication style — shaping every output Signal produces.

---

## Product Modules

| Module | Route | Description |
|---|---|---|
| Research | `/` | Lead input — 3 modes: specific lead, ICP discovery, bulk CSV upload |
| Lists | `/lists` | Active lead pipeline with contact data and signal scores |
| Brief + Outreach | `/brief/[slug]` | Split-screen: full intelligence brief (left, `flex-1`) + outreach composer (right, fixed `360px`). Outreach panel has 5 channel tabs; email tab surfaces a separate Subject input populated from the LLM draft. |
| Signals | `/signals` | Monitoring inbox — trigger events across all leads, organised by strength and recency |
| Playbook | `/playbook` | Team brain — ICP config, value props, competitors, signal weights, communication style |
| Settings | `/settings` | Integrations (HubSpot, Salesforce, Gmail, Slack), account, billing, API |

---

## Current State

The **Research module** is fully functional end-to-end with real data:

**Built and working:**
- Supabase auth — email/password + Google OAuth (signup, login, session management, middleware-protected routes, OAuth callback handler)
- Database persistence — 5 tables with RLS policies, auto-provisioning triggers for new users
- Lusha API integration — single lead lookup (LinkedIn/email/name), ICP prospecting search, CSV bulk enrichment
- ICP Discovery — natural language query → structured filters → Lusha search results (LLM parsing via OpenAI `gpt-5-mini` + keyword fallback)
- Multi-list support — create named lists, assign leads to specific lists, manage across pipeline
- City name normalisation — 3-layer resolver (static alias map → in-memory cache → OpenStreetMap Nominatim geocoding) so "Bangalore" resolves to "Bengaluru" for Lusha
- Signal score computation — automated lead scoring based on contact data quality and seniority
- Deduplication — across all enrichment paths (lookup, bulk, save-leads), with smart per-company limits for broad searches
- Lookup refresh — re-enrich stale leads with updated contact data
- Brief generation — AI research agent (agentic loop with LinkedIn + web search tools) + 5 brief agents (Who They Are, Pain Map, Angle, Why Now, Outreach Drafts) using `gpt-5.4`
- Pain Map uses a 3-layer hybrid framework (L1 role-baseline, L2 company amplifiers, L3 individual signals); L1-only pains are banned — every surfaced pain must have L2/L3 evidence
- Outreach Drafts enforces quality guardrails: banned generic openers, LinkedIn DM must open with prospect's own quoted words, follow-up must use a different angle, call opener leads with the prospect not the product, email returned as a single `Subject: ...

[body]` string
- Brief page (`/brief/[slug]`) extracts the email subject line from the LLM draft into a dedicated Subject input field; Copy to clipboard re-composes subject + body
- Multi-source data enrichment — LinkedIn profile scraping (Apify), LinkedIn posts, company data, web search (Tavily)
- Playground — test brief generation without saving to DB, debug dumps to `/tmp/playground-enrichment-*.json`
- 251 tests across 10 test files (vitest), all running in mock mode (0 Lusha credits consumed)
- Google OAuth login — "Continue with Google" button on login and signup pages using Supabase OAuth with `/auth/callback` redirect
- Settings page — fully rewritten with real user data (profile photo or initials, editable display name, read-only email, account deletion with confirmation); all fake billing/plan/invoice data removed
- Sidebar — real user profile (Google photo or initials, display name, email) with functional Sign Out; fake credits widget removed
- Account deletion API — `POST /api/account/delete` permanently deletes the authenticated user via Supabase admin client
- Top bar — removed hardcoded avatar placeholder; theme toggle remains

**Still to be built:**
- Signal monitoring — real-time trigger event detection across leads
- CRM integrations (HubSpot, Salesforce, Gmail)

> See [ARCHITECTURE.md](ARCHITECTURE.md) for full technical details.

---

## Tech Stack

- **Framework:** Next.js 16.2.0 (App Router, Turbopack)
- **Runtime:** React 19.2.4
- **Language:** TypeScript 5.7.3
- **Styling:** Tailwind CSS 4.2.0
- **UI Components:** shadcn/ui
- **Database & Auth:** Supabase (supabase-js 2.99.3)
- **Enrichment:** Lusha API
- **LLM:** OpenAI `gpt-5-mini` (research agent, ICP parse) + `gpt-5.4` (brief generation)
- **Testing:** Vitest 4.1.0
- **Package manager:** pnpm

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

> **Note:** If `pnpm` is not found, Node.js is installed via nvm. Run:
> ```bash
> export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"
> npm install -g pnpm
> pnpm install && pnpm dev
> ```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Lusha (optional — uses mock data if not set)
LUSHA_API_KEY=<your-lusha-api-key>

# LLM (optional — keyword fallback parser if unavailable)
LLM_API_KEY=<your-openai-api-key>
LLM_BASE_URL=<your-litellm-proxy-url>
LLM_MODEL=gpt-5-mini
BRIEF_MODEL=gpt-5.4

# Tests
TEST_BASE_URL=http://localhost:3000
```

### Running Tests

```bash
# Run full test suite (starts mock server automatically — 0 Lusha credits)
pnpm test

# Run a specific test file
bash test.sh tests/setup.test.ts
```

> **Warning:** Never run `npx vitest run` directly — it may hit a dev server with real API keys and consume Lusha credits. Always use `pnpm test` or `bash test.sh` which starts a dedicated mock server.

> `pnpm test` automatically starts a dev server in mock mode (no Lusha API key), runs all tests, then restarts your normal dev server with real keys. Tests never consume Lusha credits.

---

## Lusha Credit Model

- **Free plan:** 40 credits/month
- **Search** (`/prospecting/contact/search`): **1 credit per API call** (regardless of result count)
- **Enrich** (`/prospecting/contact/enrich`): free when using the same `requestId` from search
- **Mock mode:** All tests run with `LUSHA_API_KEY` unset, returning mock data at zero cost
- Credits reset monthly; unused credits do not roll over
