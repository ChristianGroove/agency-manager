-- Migration: Add 'suspended' to subscription_status enum and subscription_status CHECK
-- Fixes: 22P02 error when superadmin tries to suspend a tenant's subscription
-- The enum and CHECK constraint were missing 'suspended' as a valid value,
-- causing all suspend actions from the admin panel to fail.

-- 1. Add 'suspended' to the subscription_status ENUM type
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'suspended';

-- 2. Drop and recreate the organizations.subscription_status CHECK constraint
--    to include 'suspended' as a valid value
ALTER TABLE "public"."organizations"
  DROP CONSTRAINT IF EXISTS "organizations_subscription_status_check";

ALTER TABLE "public"."organizations"
  ADD CONSTRAINT "organizations_subscription_status_check"
  CHECK (("subscription_status" = ANY (ARRAY[
    'active'::text,
    'past_due'::text,
    'canceled'::text,
    'suspended'::text
  ])));
