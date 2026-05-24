-- Add missing structured sections to briefs table
-- who_they_are, pain_map, angle were not in the original schema
-- Also add unique constraint required for the upsert on (user_id, lead_id)

alter table briefs
  add column if not exists who_they_are jsonb,
  add column if not exists pain_map     jsonb,
  add column if not exists angle        jsonb;

-- Unique constraint needed for upsert onConflict: 'user_id,lead_id'
-- Only create if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'briefs_user_id_lead_id_key'
      and conrelid = 'briefs'::regclass
  ) then
    alter table briefs add constraint briefs_user_id_lead_id_key unique (user_id, lead_id);
  end if;
end $$;
