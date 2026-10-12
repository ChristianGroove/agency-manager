-- Additive, opt-in visual configuration. Existing platform_settings RLS is unchanged:
-- public reads, writes through the authorized super-admin server action/service role.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS pet_config jsonb NOT NULL DEFAULT '{"version":1,"enabled":false}'::jsonb;

COMMENT ON COLUMN public.platform_settings.pet_config IS
  'Public visual robot pet configuration. No credentials. Schema validated by Pixy; disabled by default.';
