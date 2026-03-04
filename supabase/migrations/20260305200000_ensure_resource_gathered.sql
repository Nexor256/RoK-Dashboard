-- Ensure resource_gathered column exists on governor_stats.
-- It was defined in the initial migration but may be missing
-- if migrations were partially applied. This also forces a
-- PostgREST schema-cache reload on push.

ALTER TABLE public.governor_stats
  ADD COLUMN IF NOT EXISTS resource_gathered BIGINT DEFAULT 0;
