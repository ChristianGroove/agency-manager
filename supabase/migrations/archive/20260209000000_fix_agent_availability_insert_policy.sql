-- Fix for: "new row violates row-level security policy for table 'agent_availability'"
-- Allow authenticated users to INSERT and UPDATE their own availability

-- 0. Drop policies if they already exist to avoid conflicts (Fix for ERROR: 42710)
DROP POLICY IF EXISTS "Users can insert their own availability" ON "public"."agent_availability";
DROP POLICY IF EXISTS "Users can update their own availability" ON "public"."agent_availability";

-- 1. Policy for INSERT
-- Users can only insert rows for themselves, and only for organizations they belong to.
CREATE POLICY "Users can insert their own availability"
ON "public"."agent_availability"
FOR INSERT TO authenticated
WITH CHECK (
  agent_id = auth.uid() AND
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- 2. Policy for UPDATE
-- Users can only update their own rows.
CREATE POLICY "Users can update their own availability"
ON "public"."agent_availability"
FOR UPDATE TO authenticated
USING (agent_id = auth.uid());

-- ensure RLS is enabled (it should be, but good practice)
ALTER TABLE "public"."agent_availability" ENABLE ROW LEVEL SECURITY;
