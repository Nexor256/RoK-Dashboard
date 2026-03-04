-- Add new columns to governor_stats to match actual CSV format:
-- ID, Name, Alliance, Power, T1 Kills, T2 Kills, T3 Kills, T4 Kills, T5 Kills,
-- Total Kills, T45 Kills, Killpoints, Deads, Ranged, Rss Gathered, Rss Assistance,
-- Helps, City Hall Level

ALTER TABLE public.governor_stats
  ADD COLUMN IF NOT EXISTS governor_id   TEXT,
  ADD COLUMN IF NOT EXISTS t1_kills      BIGINT,
  ADD COLUMN IF NOT EXISTS t2_kills      BIGINT,
  ADD COLUMN IF NOT EXISTS t3_kills      BIGINT,
  ADD COLUMN IF NOT EXISTS total_kills   BIGINT,
  ADD COLUMN IF NOT EXISTS t45_kills     BIGINT,
  ADD COLUMN IF NOT EXISTS killpoints    BIGINT,
  ADD COLUMN IF NOT EXISTS ranged        BIGINT,
  ADD COLUMN IF NOT EXISTS rss_assistance BIGINT,
  ADD COLUMN IF NOT EXISTS helps         BIGINT,
  ADD COLUMN IF NOT EXISTS city_hall_level INT;

-- Existing columns kept as-is (nullable):
--   dead_troops, healed, power_growth  (not in this CSV but may be used later)
