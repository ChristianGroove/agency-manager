-- Migration: Ensure default ai_mode is 'byok' for all organizations/tenants
-- Sets the column default on rate_limit_config and backfills existing organizations without an explicit ai_mode

ALTER TABLE "public"."organizations"
    ALTER COLUMN "rate_limit_config" SET DEFAULT '{"ai_requests_per_day": 100, "requests_per_minute": 500, "ai_mode": "byok", "ai_status": "active"}'::jsonb;

-- Backfill existing organizations where ai_mode is not defined
UPDATE "public"."organizations"
SET "rate_limit_config" = coalesce("rate_limit_config", '{}'::jsonb) || '{"ai_mode": "byok", "ai_status": "active"}'::jsonb
WHERE "rate_limit_config" IS NULL OR "rate_limit_config"->>'ai_mode' IS NULL;