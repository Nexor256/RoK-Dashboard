-- Add R4 (alliance officer) role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'r4';

-- Widen RLS policies to allow R4 the same write access as admin
-- (R4 is below admin but above regular user)
-- Use role::text cast to avoid "unsafe use of new enum value" in same transaction

-- kingdom_settings: allow R4 to update
DROP POLICY IF EXISTS "Admins can update kingdom settings" ON public.kingdom_settings;
CREATE POLICY "Admins and R4 can update kingdom settings"
  ON public.kingdom_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role::text IN ('admin', 'r4')
    )
  );

-- announcements: allow R4 to insert
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins and R4 can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('admin', 'r4')
    )
  );

-- announcements: allow R4 to delete
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins and R4 can delete announcements"
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('admin', 'r4')
    )
  );

-- kvk_wars: allow R4 to insert
DROP POLICY IF EXISTS "kvk_wars_insert" ON public.kvk_wars;
CREATE POLICY "kvk_wars_insert"
  ON public.kvk_wars FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('admin', 'r4')
    )
  );

-- kvk_wars: allow R4 to update
DROP POLICY IF EXISTS "kvk_wars_update" ON public.kvk_wars;
CREATE POLICY "kvk_wars_update"
  ON public.kvk_wars FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('admin', 'r4')
    )
  );

-- kvk_wars: allow R4 to delete
DROP POLICY IF EXISTS "kvk_wars_delete" ON public.kvk_wars;
CREATE POLICY "kvk_wars_delete"
  ON public.kvk_wars FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text IN ('admin', 'r4')
    )
  );
