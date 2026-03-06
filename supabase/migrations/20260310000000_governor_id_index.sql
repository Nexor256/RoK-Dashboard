-- Index to speed up governor history lookups by governor_id
CREATE INDEX IF NOT EXISTS idx_governor_stats_governor_id ON public.governor_stats (governor_id);
