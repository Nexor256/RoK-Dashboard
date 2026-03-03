ALTER TABLE public.kvk_stats 
  DROP COLUMN IF EXISTS passes_used,
  DROP COLUMN IF EXISTS rallies_joined,
  DROP COLUMN IF EXISTS garrisons_joined;