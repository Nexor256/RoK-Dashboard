-- Allow authenticated users to insert their own profile (for auto-creation on first login)
-- The existing policy only allows auth.uid() = user_id, which is correct.
-- But ensure it covers the case where the profile doesn't exist yet.
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Secure function: assigns admin role to the calling user ONLY if no admins exist yet.
-- This allows the very first user to bootstrap themselves as admin.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

-- Allow authenticated users to insert into user_roles via the RPC function only
-- (The function uses SECURITY DEFINER, so it bypasses RLS)
-- Also add a direct INSERT policy so the auto-admin check in useAuth works
CREATE POLICY "First admin can self-assign"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  );
