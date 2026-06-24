-- Add status column to organization_members for blocking users
ALTER TABLE "public"."organization_members" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
