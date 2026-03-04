-- Fix admin role: only abdotalat2022@gmail.com is admin.
-- 1) Remove all existing admin roles
DELETE FROM public.user_roles WHERE role = 'admin';

-- 2) Assign admin to the fixed email (if the user exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'abdotalat2022@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3) Drop the self-assign policy so no one else can become admin
DROP POLICY IF EXISTS "First admin can self-assign" ON public.user_roles;

-- 4) Drop the old claim_first_admin function
DROP FUNCTION IF EXISTS public.claim_first_admin();
