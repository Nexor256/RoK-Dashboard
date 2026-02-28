
-- Update RLS policies to require authentication

-- snapshots
DROP POLICY IF EXISTS "Allow all access to snapshots" ON public.snapshots;
CREATE POLICY "Authenticated users can read snapshots"
  ON public.snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert snapshots"
  ON public.snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update snapshots"
  ON public.snapshots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete snapshots"
  ON public.snapshots FOR DELETE TO authenticated USING (true);

-- governor_stats
DROP POLICY IF EXISTS "Allow all access to governor_stats" ON public.governor_stats;
CREATE POLICY "Authenticated users can read governor_stats"
  ON public.governor_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert governor_stats"
  ON public.governor_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update governor_stats"
  ON public.governor_stats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete governor_stats"
  ON public.governor_stats FOR DELETE TO authenticated USING (true);

-- kvk_stats
DROP POLICY IF EXISTS "Allow all access to kvk_stats" ON public.kvk_stats;
CREATE POLICY "Authenticated users can read kvk_stats"
  ON public.kvk_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert kvk_stats"
  ON public.kvk_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update kvk_stats"
  ON public.kvk_stats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete kvk_stats"
  ON public.kvk_stats FOR DELETE TO authenticated USING (true);
