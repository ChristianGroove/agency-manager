-- Add main_logo_light_url to platform_settings
ALTER TABLE "public"."platform_settings"
ADD COLUMN IF NOT EXISTS "main_logo_light_url" text;

-- Add main_logo_light_url to organization_settings
ALTER TABLE "public"."organization_settings"
ADD COLUMN IF NOT EXISTS "main_logo_light_url" text;
