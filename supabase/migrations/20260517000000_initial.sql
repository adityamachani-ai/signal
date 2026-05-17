-- Signal Database Schema
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- ─── LEADS ────────────────────────────────────────────────────────────────────
-- Stores every lead a user has looked up or enriched, with all raw data from Lusha

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Identity
  lusha_id text,                        -- Lusha's internal contact ID (for enrichment calls)
  full_name text not null,
  first_name text,
  last_name text,

  -- Role
  job_title text,
  seniority text,                       -- "vp", "c_level", "director", "manager" etc.
  department text,

  -- Contact (populated after enrich step)
  email text,
  email_verified boolean default false,
  phone_direct text,
  phone_mobile text,
  linkedin_url text,

  -- Company
  company_name text,
  company_domain text,
  company_size_range text,              -- "51-200" etc.
  company_industry text,
  company_funding_stage text,           -- "series_b" etc.
  company_total_funding_usd bigint,
  company_last_funding_date date,
  company_headcount integer,
  company_location text,
  company_linkedin_url text,

  -- Location
  city text,
  country text,

  -- Enrichment metadata (waterfall-ready)
  enrichment_source text default 'lusha',   -- which provider this came from
  enrichment_raw jsonb,                      -- full raw payload stored for brief generation later
  enriched_at timestamptz,

  -- Signal score (computed at Tier 1 from Lusha data)
  signal_score text check (signal_score in ('strong', 'medium', 'low')),
  signal_reasons jsonb,                      -- array of reasons e.g. ["job_change_90d", "series_b"]

  -- State
  in_list boolean default false,            -- has been added to the user's active list
  brief_generated boolean default false,    -- has a brief been generated

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── LISTS ────────────────────────────────────────────────────────────────────
-- Named lists (currently just one default list per user)

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'My List',
  color text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Junction: which leads are in which list
create table if not exists list_leads (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique(list_id, lead_id)
);

-- ─── BRIEFS ───────────────────────────────────────────────────────────────────
-- Generated intelligence briefs for leads

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null,

  -- Structured brief sections
  summary text,
  why_now jsonb,                         -- array of signal cards
  intelligence jsonb,                    -- person + company intelligence sections
  recommended_approach jsonb,            -- channel, lead_with, angle, avoid

  -- Outreach drafts
  outreach_drafts jsonb,                 -- {"linkedin-note": "...", "email": "...", ...}

  -- Generation metadata
  generated_at timestamptz default now(),
  generation_sources jsonb,             -- what sources were used to generate this brief
  outreach_context text                 -- what the rep told Signal they're trying to achieve

);

-- ─── PLAYBOOK ─────────────────────────────────────────────────────────────────
-- One playbook per user (or team later)

create table if not exists playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Product section
  problem text,
  for_who text,
  different text,

  -- ICP section
  company_sizes jsonb,                  -- ["51-200", "201-500"]
  funding_stages jsonb,
  industries jsonb,
  tech_stack jsonb,
  target_titles jsonb,
  seniority_levels jsonb,
  negative_icp text,

  -- Value props
  value_props jsonb,                    -- array of {outcome, persona, delivery}

  -- Competitors
  competitors jsonb,                    -- array of {name, weakness, angle}

  -- Communication style
  tone jsonb,
  message_length jsonb,
  never_use jsonb,
  good_openers text,

  -- Signal settings
  signal_weights jsonb,
  keywords jsonb,
  alert_threshold integer default 6,
  alert_frequency text default 'realtime',
  notify_via jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Users can only see their own data

alter table leads enable row level security;
alter table lists enable row level security;
alter table list_leads enable row level security;
alter table briefs enable row level security;
alter table playbooks enable row level security;

create policy "Users see own leads" on leads for all using (auth.uid() = user_id);
create policy "Users see own lists" on lists for all using (auth.uid() = user_id);
create policy "Users see own list_leads" on list_leads for all
  using (exists (select 1 from lists where lists.id = list_leads.list_id and lists.user_id = auth.uid()));
create policy "Users see own briefs" on briefs for all using (auth.uid() = user_id);
create policy "Users see own playbook" on playbooks for all using (auth.uid() = user_id);

-- ─── AUTO-CREATE DEFAULT LIST & PLAYBOOK FOR NEW USERS ───────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lists (user_id, name) values (new.id, 'My List');
  insert into public.playbooks (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
