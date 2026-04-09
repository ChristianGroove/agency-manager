-- MIGRATION: 20260108000001_fix_agent_availability_rls.sql
-- FIX: Agent Availability RLS Isolation

-- 1. Drop insecure policies
DROP POLICY IF EXISTS "Users can view all agents" ON "public"."agent_availability";
DROP POLICY IF EXISTS "agent_availability_select_by_org" ON "public"."agent_availability";

-- 2. Create secure policy
CREATE POLICY "agent_availability_select_by_org"
ON "public"."agent_availability"
FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
