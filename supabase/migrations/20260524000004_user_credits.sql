-- ─── USER CREDITS ─────────────────────────────────────────────────────────────
-- Lifetime usage counters per user. Never resets.

create table if not exists user_credits (
  user_id           uuid        primary key references auth.users(id) on delete cascade,
  is_admin          boolean     not null default false,
  icp_searches_used int         not null default 0,
  enrichments_used  int         not null default 0,
  briefs_used       int         not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table user_credits enable row level security;

-- Users can read their own row; all writes go through service role only
create policy "Users read own credits" on user_credits
  for select using (auth.uid() = user_id);

-- ─── Atomic increment function ────────────────────────────────────────────────
create or replace function increment_credit(
  p_user_id uuid,
  p_type    text,
  p_count   int default 1
)
returns void language sql security definer set search_path = public as $$
  update user_credits set
    icp_searches_used = icp_searches_used + (case when p_type = 'icp_searches' then p_count else 0 end),
    enrichments_used  = enrichments_used  + (case when p_type = 'enrichments'  then p_count else 0 end),
    briefs_used       = briefs_used       + (case when p_type = 'briefs'       then p_count else 0 end),
    updated_at        = now()
  where user_id = p_user_id;
$$;

-- ─── Update new-user trigger ──────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lists        (user_id, name) values (new.id, 'My List');
  insert into public.playbooks    (user_id)        values (new.id);
  insert into public.user_credits (user_id)        values (new.id);
  return new;
end;
$$;
