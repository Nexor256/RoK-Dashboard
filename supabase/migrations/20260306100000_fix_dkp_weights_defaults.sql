-- Update DKP weights: remove kvk_kills/kvk_deaths, set new defaults (T4=5, T5=10, Dead=40)
UPDATE kingdom_settings
  SET dkp_weights = '{"t4_kills":5,"t5_kills":10,"dead_troops":40}'::jsonb,
      updated_at = now();

-- Also update the column default for new rows
ALTER TABLE kingdom_settings
  ALTER COLUMN dkp_weights SET DEFAULT '{"t4_kills":5,"t5_kills":10,"dead_troops":40}'::jsonb;
