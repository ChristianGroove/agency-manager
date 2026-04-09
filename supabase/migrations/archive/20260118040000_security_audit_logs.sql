-- MIGRATION: 20260118040000_security_audit_logs.sql
-- OBJECTIVE: Create an immutable audit log for security and forensic analysis.

CREATE TABLE IF NOT EXISTS "public"."security_audit_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "actor_id" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "action" text NOT NULL,
    "resource_entity" text NOT NULL, -- e.g. 'leads', 'invoices', 'settings'
    "resource_id" text,              -- Target ID
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE "public"."security_audit_logs" ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- 1. View Access: Only Organization Owners/Admins can view their own logs
CREATE POLICY "Admins can view their org audit logs"
ON "public"."security_audit_logs"
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- 2. Insert Access: NO DIRECT CLIENT INSERT allowed.
-- All insertions must go through the Backend Service (SecurityLogger) using Service Role (supabaseAdmin).
-- This prevents users from forging logs or flooding the system.

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_audit_org_created" ON "public"."security_audit_logs" ("organization_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "public"."security_audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "public"."security_audit_logs" ("action");
