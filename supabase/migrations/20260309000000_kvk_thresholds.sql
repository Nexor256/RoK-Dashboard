-- Add dkp_thresholds JSONB to kingdom_settings
-- Stores an array of power tiers: [{ min_power, min_dkp, min_deaths }]
-- Sorted by min_power ascending; governor matches the highest tier where power >= min_power

alter table public.kingdom_settings
  add column if not exists dkp_thresholds jsonb not null default '[]'::jsonb;
