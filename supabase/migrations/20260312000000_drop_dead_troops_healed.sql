-- Remove dead_troops (redundant with deaths) and healed (no real data source)
ALTER TABLE governor_stats DROP COLUMN IF EXISTS dead_troops;
ALTER TABLE governor_stats DROP COLUMN IF EXISTS healed;
