-- Kingdom settings: single-row table storing kingdom number & name
CREATE TABLE IF NOT EXISTS public.kingdom_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kingdom_number integer NOT NULL DEFAULT 0,
  kingdom_name   text    NOT NULL DEFAULT '',
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Seed with a default row if empty
INSERT INTO public.kingdom_settings (kingdom_number, kingdom_name)
SELECT 0, ''
WHERE NOT EXISTS (SELECT 1 FROM public.kingdom_settings);

-- Everyone who is authenticated can read
ALTER TABLE public.kingdom_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read kingdom settings"
  ON public.kingdom_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can update kingdom settings"
  ON public.kingdom_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );
