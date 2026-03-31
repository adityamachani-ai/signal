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
| Brief + Outreach | `/brief/[slug]` | Split-screen: full intelligence brief (left) + outreach composer (right) |
| Signals | `/signals` | Monitoring inbox — trigger events across all leads, organised by strength and recency |
| Playbook | `/playbook` | Team brain — ICP config, value props, competitors, signal weights, communication style |
| Settings | `/settings` | Integrations (HubSpot, Salesforce, Gmail, Slack), account, billing, API |

---

## Current State

The **Research module** is fully functional end-to-end with real data:

**Built and working:**
- Supabase auth (email/password signup + login, session management, middleware-protected routes)
- Database persistence — 5 tables with RLS policies, auto-provisioning triggers for new users
- Lusha API integration — single lead lookup (LinkedIn/email/name), ICP prospecting search, CSV bulk enrichment
- ICP Discovery — natural language query → structured filters → Lusha search results (with LLM + keyword fallback parser)
- City name normalisation — 3-layer resolver (static alias map → in-memory cache → OpenStreetMap Nominatim geocoding) so "Bangalore" resolves to "Bengaluru" for Lusha
- Signal score computation — automated lead scoring based on contact data quality and seniority
- Deduplication — across all enrichment paths (lookup, bulk, save-leads)
- 199 passing tests across 8 test files (vitest), all running in mock mode (0 Lusha credits consumed)

**Still mocked (needs to be built):**
- Brief generation — AI synthesis engine (streaming output via Vercel AI SDK)
- Signal monitoring — real-time trigger event detection across leads
- CRM integrations (HubSpot, Salesforce, Gmail)
- Multi-source data enrichment (LinkedIn scraping, Google News, job boards)

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
- **LLM:** Azure OpenAI via LiteLLM proxy (with keyword fallback)
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

# Azure OpenAI / LiteLLM (optional — keyword fallback if unavailable)
AZURE_OPENAI_API_KEY=<your-llm-api-key>
AZURE_OPENAI_ENDPOINT=<your-llm-endpoint>
AZURE_OPENAI_MODEL_NAME=azure/gpt-4.1-nano
AZURE_OPENAI_REGION=southindia

# Tests
TEST_BASE_URL=http://localhost:3000
```

### Running Tests

```bash
# Run full test suite (starts mock server automatically — 0 Lusha credits)
pnpm test

# Run a specific test file (requires mock server or dev server running)
pnpm exec vitest run tests/setup.test.ts --reporter=verbose
```

> **Note:** `pnpm test` automatically starts a dev server in mock mode (no Lusha API key), runs all tests, then restarts your normal dev server with real keys. Tests never consume Lusha credits.
