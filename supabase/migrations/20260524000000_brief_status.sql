-- Add brief generation tracking columns to leads
-- brief_status: null = never generated, 'generating' = in-flight, 'generated' = saved
-- brief_generation_started_at: when the most recent generation kick-off happened
-- brief_generated_at: when the last successful save completed

alter table leads
  add column if not exists brief_status text check (brief_status in ('generating', 'generated')),
  add column if not exists brief_generation_started_at timestamptz,
  add column if not exists brief_generated_at timestamptz;
