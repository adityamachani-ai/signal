# Architecture

Technical reference for the Signal codebase. For product overview, see [README.md](README.md).

---

## Project Structure

```
signal/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (ThemeProvider, sidebar)
│   ├── page.tsx                # Research module — main dashboard
│   ├── login/page.tsx          # Email/password login
│   ├── signup/page.tsx         # Email/password signup
│   ├── brief/[slug]/page.tsx   # Lead brief + outreach composer
│   ├── lists/page.tsx          # Lead pipeline table
│   ├── my-leads/page.tsx       # Redirect → /lists
│   ├── playbook/page.tsx       # ICP config, value props, competitors
│   ├── settings/page.tsx       # Integrations, account, billing
│   ├── signals/page.tsx        # Signal monitoring feed
│   ├── auth/callback/route.ts  # OAuth callback handler
│   └── api/research/           # Backend API routes
│       ├── lookup/route.ts
│       ├── leads/route.ts
│       ├── bulk-enrich/route.ts
│       ├── add-to-list/route.ts
│       ├── save-leads/route.ts
│       ├── icp-parse/route.ts
│       └── icp-search/route.ts
├── components/
│   ├── signal/                 # App-specific components
│   │   ├── icp-discovery.tsx   # ICP Discovery UI (filters, results, pagination)
│   │   ├── specific-lead.tsx   # Single lead lookup UI
│   │   ├── bulk-upload.tsx     # CSV bulk upload UI
│   │   ├── results-table.tsx   # Shared results table (variant: icp|specific|bulk)
│   │   ├── mode-selector.tsx   # Research mode tabs
│   │   ├── top-bar.tsx         # Search bar + outreach context
│   │   ├── sidebar.tsx         # Navigation sidebar
│   │   ├── tag-input.tsx       # Tag input component
│   │   └── outreach-context-bar.tsx
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── auth.ts                 # JWT/cookie auth helper
│   ├── geocode.ts              # City name resolver (alias map → cache → Nominatim)
│   ├── icp-filters.ts          # ParsedFilters interface, validation, enums
│   ├── lusha.ts                # Lusha API wrapper
│   ├── llm.ts                  # Azure OpenAI / LiteLLM client
│   ├── signal-score.ts         # Lead scoring engine
│   ├── utils.ts                # Tailwind cn() utility
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server Supabase client (per-request)
│       └── service.ts          # Service role client (bypasses RLS)
├── middleware.ts               # Auth guard for page routes
├── test.sh                     # Test runner (mock mode, 0 Lusha credits)
├── supabase/schema.sql         # Full database schema
└── tests/                      # Vitest integration + unit tests
```

---

## Database Schema

All tables use UUID primary keys and cascade deletes on user removal. RLS is enabled on every table — users can only access their own data.

### leads

Stores every enriched or shell lead record.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| user_id | uuid | FK → auth.users, NOT NULL |
| lusha_id | text | Lusha internal contact ID |
| full_name | text | NOT NULL |
| first_name, last_name | text | |
| job_title | text | |
| seniority | text | e.g. "vp", "c_level", "director" |
| department | text | |
| email | text | |
| email_verified | boolean | default false |
| phone_direct, phone_mobile | text | |
| linkedin_url | text | |
| company_name | text | |
| company_domain | text | |
| company_size_range | text | e.g. "51-200" |
| company_industry | text | |
| company_funding_stage | text | e.g. "series_b" |
| company_total_funding_usd | bigint | |
| company_last_funding_date | date | |
| company_headcount | integer | |
| company_location | text | |
| company_linkedin_url | text | |
| city, country | text | |
| enrichment_source | text | default "lusha" |
| enrichment_raw | jsonb | Full raw API payload |
| enriched_at | timestamptz | NULL = shell (not yet enriched) |
| signal_score | text | CHECK: "strong", "medium", "low" |
| signal_reasons | jsonb | Array of reason strings |
| in_list | boolean | default false |
| brief_generated | boolean | default false |
| created_at, updated_at | timestamptz | auto-set |

### lists

Named lead lists (one default "My List" per user, auto-created on signup).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users, NOT NULL |
| name | text | NOT NULL, default "My List" |
| created_at | timestamptz | |

### list_leads

Junction table linking leads to lists.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| list_id | uuid | FK → lists |
| lead_id | uuid | FK → leads |
| added_at | timestamptz | |
| | | UNIQUE(list_id, lead_id) |

### briefs

Generated intelligence documents for leads.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| lead_id | uuid | FK → leads |
| summary | text | |
| why_now | jsonb | Array of signal cards |
| intelligence | jsonb | Person + company intel |
| recommended_approach | jsonb | Channel, angle, avoid |
| outreach_drafts | jsonb | Per-channel drafts |
| generated_at | timestamptz | |
| generation_sources | jsonb | |
| outreach_context | text | Rep's stated goal |

### playbooks

Per-user team configuration (auto-created on signup).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| problem, for_who, different | text | Product definition |
| company_sizes, funding_stages, industries, tech_stack | jsonb | ICP filters |
| target_titles, seniority_levels | jsonb | |
| negative_icp | text | |
| value_props | jsonb | Array of {outcome, persona, delivery} |
| competitors | jsonb | Array of {name, weakness, angle} |
| tone, message_length, never_use | jsonb | Communication style |
| good_openers | text | |
| signal_weights, keywords | jsonb | Signal config |
| alert_threshold | integer | default 6 |
| alert_frequency | text | default "realtime" |
| notify_via | jsonb | |
| created_at, updated_at | timestamptz | |

### Triggers

- **`on_auth_user_created`** — fires on `auth.users` INSERT. Calls `handle_new_user()` which auto-creates a default "My List" and a default playbook for every new user.

---

## API Routes

All routes under `/api/research/` require authentication via Bearer token or Supabase cookie session. Returns 401 for unauthenticated requests.

### POST /api/research/lookup

Single lead enrichment via Lusha.

**Request:**
```json
{
  "type": "linkedin" | "email" | "name",
  "linkedinUrl": "https://linkedin.com/in/...",   // when type=linkedin
  "email": "jane@company.com",                     // when type=email
  "firstName": "Jane", "lastName": "Doe", "company": "Acme"  // when type=name
}
```

**Response:** `{ lead: Lead, cached: boolean }`

**Behavior:**
- Checks DB for existing enriched lead with same linkedin_url or email (dedup)
- If cached, returns immediately without spending a Lusha credit
- Otherwise calls Lusha API, computes signal score, inserts into DB
- Returns 404 if Lusha finds no match, 429 on rate limit

### GET /api/research/leads

Returns the authenticated user's enriched leads, newest first.

**Query params:** `limit` (default 200, max 200)

**Response:** `{ leads: Lead[] }`

Only returns leads where `enriched_at IS NOT NULL`.

### POST /api/research/bulk-enrich

Enriches CSV rows in batches with concurrency control.

**Request:**
```json
{
  "rows": [
    {
      "rowIndex": 0,
      "linkedinUrl": "...",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      "fullName": "...",
      "company": "...",
      "jobTitle": "..."
    }
  ]
}
```

**Response:** `{ results: BulkRowResult[], totalProcessed, skipped, duplicates, errors }`

**Behavior:**
- Max 1000 rows per request
- Deduplicates against existing DB leads (by linkedin_url, email, or lusha_id)
- Lookup priority: LinkedIn URL → email → name+company
- Concurrency: 5 parallel Lusha calls per batch
- Each result has status: "enriched", "skipped", "already_saved", "error"

### POST /api/research/add-to-list

Adds leads to the user's default list.

**Request:** `{ leadIds: string[] }`
**Response:** `{ success: true }`

Upserts silently on duplicate (same lead already in list).

### POST /api/research/save-leads

Saves ICP Discovery results to DB with Lusha enrichment.

**Request:**
```json
{
  "leads": [
    {
      "name": "Jane Doe",
      "jobTitle": "VP Sales",
      "companyName": "Acme",
      "fqdn": "acme.com",
      "lushaContactId": "abc123"
    }
  ]
}
```

**Response:** `{ saved: Lead[], skipped: PartialLead[], duplicates: string[] }`

**Behavior:**
- Deduplicates by lusha_id against existing DB leads
- Enriches each lead via Lusha person API (concurrency: 5)
- Computes signal score on enriched leads
- Adds all saved leads to user's default list

### POST /api/research/icp-parse

Parses a natural language ICP query into structured Lusha API filters.

**Request:** `{ query: "VP of Sales at SaaS companies in the US" }`

**Response:**
```json
{
  "filters": {
    "jobTitles": ["VP of Sales", "Vice President of Sales"],
    "departments": ["Sales"],
    "seniorities": ["Vice President"],
    "seniorityIds": ["8"],
    "locations": [{ "country": "United States" }],
    "companyNames": [],
    "companySizes": [],
    "notes": ["Parsed using keyword matching (LLM unavailable)"],
    "summary": "VP of Sales at SaaS companies in the US"
  }
}
```

**Behavior:**
- Attempts LLM parsing first (Azure OpenAI via LiteLLM) with 5-second timeout
- On LLM failure/timeout, falls back to keyword-based parser using dictionaries for titles, seniorities, departments, locations, company names, and industries
- LLM prompt instructs canonical city names (Bengaluru not Bangalore, Mumbai not Bombay)
- Validates and filters department/seniority values against Lusha's taxonomy (see `lib/icp-filters.ts`)
- Maps seniority names to Lusha seniority IDs
- Never returns an error — always produces usable filters

### POST /api/research/icp-search

Searches Lusha Prospecting API with structured filters.

**Request:**
```json
{
  "filters": { ... },  // ParsedFilters from icp-parse
  "limit": 25,
  "maxPerCompany": 3
}
```

**Response:**
```json
{
  "results": [
    {
      "contactId": "...",
      "personId": 12345,
      "name": "Jane Doe",
      "jobTitle": "VP Sales",
      "companyName": "Acme",
      "companyId": 67890,
      "fqdn": "acme.com",
      "companyDescription": "...",
      "logoUrl": "https://...",
      "location": "New York, United States",
      "hasEmail": true,
      "hasPhone": true,
      "hasMobilePhone": false,
      "hasDirectPhone": true,
      "hasLinkedIn": true
    }
  ],
  "totalResults": 118456,
  "creditsCharged": 1,
  "appliedFilters": { ... }
}
```

**Behavior:**
- City names are resolved to canonical form via `lib/geocode.ts` (e.g. "Bangalore" → "Bengaluru")
- Lusha requires locations as separate objects: `[{city: "Bengaluru"}, {country: "India"}]` — NOT combined
- When seniority already covers the intent (e.g. "Founder"), the same word is excluded from jobTitles to avoid overly restrictive AND filtering
- Deduplicates results by company (respects maxPerCompany)
- Falls back to mock data if no Lusha API key configured

---

## Key Library Modules

### lib/auth.ts — `getAuthUser(request)`

Extracts and validates the user from a Next.js request. Checks:
1. `Authorization: Bearer <token>` header
2. Supabase cookie session

Returns `{ user, error }` where error is a 401 NextResponse if auth fails.

### lib/lusha.ts — Lusha API Wrapper

- `lookupContact(input: LookupInput)` — calls Lusha person API by LinkedIn URL, email, or name+company
- Returns a `LushaContact` with normalized fields (fullName, emails[], phones[], company details)
- Falls back to mock data if `LUSHA_API_KEY` is not set
- Throws `LushaApiError` with codes: `RATE_LIMIT`, `NOT_FOUND`, `API_ERROR`

### lib/geocode.ts — City Name Resolver

Resolves city names to their official/canonical form for Lusha API compatibility.

**3-layer resolution:**
1. **Static alias map** — instant lookup for ~20 common aliases (Bangalore→Bengaluru, NYC→New York, etc.)
2. **In-memory cache** — auto-populated at runtime, avoids repeat lookups
3. **OpenStreetMap Nominatim** — free geocoding API, resolves any city worldwide to its canonical name

`resolveCity(city: string): Promise<string>` — checks each layer in order, falls back to original input if all fail.

### lib/icp-filters.ts — Filter Validation

- `ParsedFilters` interface — typed structure for ICP search filters
- `VALID_DEPARTMENTS`, `VALID_SENIORITIES`, `VALID_COUNTRIES` — Lusha-compatible enums
- `validateLlmResponse(raw, query)` — validates and normalizes LLM output
- `fallbackParse(query)` — keyword-based parser for when LLM is unavailable

### lib/signal-score.ts — `computeSignalScore(contact)`

Scores leads based on data quality and seniority:

| Signal | Points |
|---|---|
| Has direct email | +2 |
| Has phone number | +2 |
| Has LinkedIn profile | +1 |
| Senior seniority (VP, C-level, Director) | +2 |
| Senior job title (contains Director, VP, Chief, Founder) | +2 |
| Mid-size+ company (51+ employees) | +1 |
| Has verified company domain | +1 |

**Score thresholds:** strong (≥6), medium (4-5), low (≤3)

Returns `{ score: 'strong' | 'medium' | 'low', reasons: string[] }`

### lib/llm.ts — LLM Client

- `getLlm()` — returns a lazy-initialized OpenAI client pointing at the configured Azure/LiteLLM endpoint
- `LLM_MODEL` — model identifier (default: `azure/gpt-4.1-nano`)

### lib/supabase/

- `client.ts` — browser-side Supabase client (uses anon key)
- `server.ts` — per-request server client (respects Bearer token for API routes, cookies for pages)
- `service.ts` — service role client (bypasses RLS, server-only)

---

## Authentication Flow

1. **Signup** (`/signup`) — creates user via Supabase auth, sends confirmation email
2. **Login** (`/login`) — email/password → Supabase session → cookies set
3. **OAuth callback** (`/auth/callback`) — exchanges code for session, redirects to `/`
4. **Middleware** (`middleware.ts`) — protects all page routes; redirects to `/login` if no valid session
5. **API auth** — each route calls `getAuthUser(request)` which accepts Bearer token or cookie

Public routes (no auth): `/login`, `/signup`, `/auth/callback`, `/_next/*`, `/api/*` (auth handled per-route)

---

## Middleware

`middleware.ts` runs on every page navigation:
- Skips: `/login`, `/signup`, `/auth/callback`, `/_next/*`, `/api/*`
- For all other routes: validates Supabase session from cookies, auto-refreshes expired sessions
- Redirects to `/login` if unauthenticated

---

## Test Suite

**Framework:** Vitest 4.1.0  
**Total:** 8 files, 199 tests (198 passing, 1 skipped)  
**Mock mode:** `pnpm test` runs all tests with zero Lusha credits consumed

```bash
# Run all tests (starts mock server automatically)
pnpm test

# Run specific file (requires dev server running)
pnpm exec vitest run tests/setup.test.ts --reporter=verbose
```

### How mock mode works

`test.sh` manages the full lifecycle:
1. Kills any existing dev server on port 3000
2. Starts a fresh dev server with `LUSHA_API_KEY=` (empty → mock data)
3. Runs vitest (which also deletes `LUSHA_API_KEY` from its own process via `vitest.config.ts`)
4. Kills the mock server
5. Restarts the normal dev server with real API keys

Tests check `HAS_REAL_KEY = !!process.env.LUSHA_API_KEY` to adjust assertions for mock vs real responses.

| File | Tests | Coverage |
|---|---|---|
| `setup.test.ts` | 9 | Supabase connection, auth signup/login, RLS data isolation |
| `lusha-integration.test.ts` | 9 | Lusha lookup (LinkedIn/email/name), add-to-list, dedup |
| `bulk-upload.test.ts` | 46 | Bulk enrich validation, lookup methods, dedup, batching, DB insertion, save-leads |
| `research-leads.test.ts` | 17 | GET /leads response shape, lookup dedup cache, bulk phone field |
| `icp-discovery.test.ts` | 70 | ICP parse (NL → filters), ICP search (filters → results), E2E flow, pagination, edge cases |
| `signal-score.test.ts` | 17 | computeSignalScore unit tests (all signal types and edge cases) |
| `new-features.test.ts` | 3 | save-leads enrichment/dedup, lookup signal_score |
| `phases.test.ts` | 28 | Multi-phase enrichment, save-leads batching, query length limits |

Tests create temporary users, run assertions, then clean up. Each file is self-contained.

---

## Known Issues

| Issue | Impact | Workaround |
|---|---|---|
| Lusha uses canonical city names only | "Bangalore" returns 0 results, "Bengaluru" returns 39K | `lib/geocode.ts` resolves via alias map + Nominatim |
| Lusha locations must be separate objects | `{city, country}` combined returns 0 results | `icp-search` sends `[{city: "X"}, {country: "Y"}]` separately |
| Lusha country-only filter intermittently 500s | e.g. `{country: "India"}` sometimes fails | Prefer city filters; country-only is fallback |
| Lusha `pages.size` minimum is 10 | Sizes < 10 return 400 | `fetchSize` always ≥ 10 |
| Next.js dev server drops keep-alive connections | Intermittent SocketErrors in tests | Tests use `Connection: close` header + 3-attempt retry |
| Next.js 16 blocks two dev servers from same dir | Can't run test server on separate port | `test.sh` stops dev server, runs tests, then restarts |
| `middleware` file convention deprecated in Next.js 16 | Console warning on startup | Functional, migrate to `proxy` convention later |
| `eslint` key in next.config.mjs no longer supported | Console warning on startup | Non-breaking, remove when convenient |
