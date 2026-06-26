-- Add a unique constraint to allow upserts.
-- Includes channel_id to properly isolate templates across different WABA connections in the same org.
ALTER TABLE "public"."messaging_templates"
ADD CONSTRAINT "messaging_templates_org_channel_name_lang_key" 
UNIQUE ("organization_id", "channel_id", "name", "language");

