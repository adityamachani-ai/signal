-- Add structured brief section columns
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS pain_map jsonb;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS who_they_are jsonb;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS angle jsonb;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS enrichment_raw_extended jsonb;

-- Add extended enrichment to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_extended jsonb;
