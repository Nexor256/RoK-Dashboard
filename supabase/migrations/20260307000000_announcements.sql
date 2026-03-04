-- Announcements table for admin-posted kingdom announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Everyone can read
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert announcements" ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'abdotalat2022@gmail.com'
  );

CREATE POLICY "Admins can delete announcements" ON announcements FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'abdotalat2022@gmail.com'
  );
