-- Rename the "dead_troops" key to "deaths" in the stored dkp_weights JSONB
UPDATE kingdom_settings
SET dkp_weights = jsonb_build_object(
  't4_kills', COALESCE((dkp_weights->>'t4_kills')::numeric, 5),
  't5_kills', COALESCE((dkp_weights->>'t5_kills')::numeric, 10),
  'deaths',   COALESCE((dkp_weights->>'dead_troops')::numeric, (dkp_weights->>'deaths')::numeric, 40)
)
WHERE dkp_weights IS NOT NULL;
