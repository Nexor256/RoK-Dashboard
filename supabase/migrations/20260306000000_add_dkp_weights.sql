-- Add DKP formula weights as a JSONB column on kingdom_settings
ALTER TABLE kingdom_settings
  ADD COLUMN IF NOT EXISTS dkp_weights jsonb
  NOT NULL
  DEFAULT '{"t4_kills":5,"t5_kills":10,"dead_troops":40}'::jsonb;
