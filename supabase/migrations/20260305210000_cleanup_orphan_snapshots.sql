-- Delete orphaned snapshots that have no associated governor_stats or kvk_stats rows.
-- These were created by failed uploads before rollback logic was added.

DELETE FROM public.snapshots s
WHERE NOT EXISTS (
  SELECT 1 FROM public.governor_stats gs WHERE gs.snapshot_id = s.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.kvk_stats ks WHERE ks.snapshot_id = s.id
);
