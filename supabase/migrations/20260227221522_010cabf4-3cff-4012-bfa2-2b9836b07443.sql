
-- Snapshots table
CREATE TABLE public.snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('general', 'kvk')),
  label TEXT
);

-- Governor stats (one row per governor per snapshot)
CREATE TABLE public.governor_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  governor_name TEXT NOT NULL,
  alliance TEXT,
  power BIGINT DEFAULT 0,
  t4_kills BIGINT DEFAULT 0,
  t5_kills BIGINT DEFAULT 0,
  deaths BIGINT DEFAULT 0,
  dead_troops BIGINT DEFAULT 0,
  healed BIGINT DEFAULT 0,
  resource_gathered BIGINT DEFAULT 0,
  power_growth BIGINT DEFAULT 0
);

-- KvK stats (one row per governor per snapshot)
CREATE TABLE public.kvk_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  governor_name TEXT NOT NULL,
  alliance TEXT,
  honor BIGINT DEFAULT 0,
  contribution BIGINT DEFAULT 0,
  passes_used BIGINT DEFAULT 0,
  rallies_joined BIGINT DEFAULT 0,
  garrisons_joined BIGINT DEFAULT 0,
  kvk_kills BIGINT DEFAULT 0,
  kvk_deaths BIGINT DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kvk_stats ENABLE ROW LEVEL SECURITY;

-- For now (no auth), allow all access. When auth is added, replace with is_admin() checks.
CREATE POLICY "Allow all access to snapshots" ON public.snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to governor_stats" ON public.governor_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to kvk_stats" ON public.kvk_stats FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_governor_stats_snapshot ON public.governor_stats(snapshot_id);
CREATE INDEX idx_kvk_stats_snapshot ON public.kvk_stats(snapshot_id);
