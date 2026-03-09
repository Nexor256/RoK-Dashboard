-- Store a plain-text copy of passwords so the admin can view them
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_plain text;
