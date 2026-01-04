-- Enable RLS for both tables
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

-- 1. CONVERSATIONS POLICIES
-- Drop potentially conflicting/partial policies
DROP POLICY IF EXISTS "Enable delete for users based on organization_id" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow select for authenticated users" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."conversations";
DROP POLICY IF EXISTS "Allow update for authenticated users" ON "public"."conversations";

-- Re-create full CRUD policies for authenticated users
CREATE POLICY "Allow select for authenticated users"
ON "public"."conversations"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users"
ON "public"."conversations"
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON "public"."conversations"
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow delete for authenticated users"
ON "public"."conversations"
FOR DELETE
TO authenticated
USING (true);

-- 2. MESSAGES POLICIES
-- Drop potential conflicting policies
DROP POLICY IF EXISTS "Allow delete messages for authenticated users" ON "public"."messages";
DROP POLICY IF EXISTS "Allow select messages for authenticated users" ON "public"."messages";
DROP POLICY IF EXISTS "Allow insert messages for authenticated users" ON "public"."messages";
DROP POLICY IF EXISTS "Allow update messages for authenticated users" ON "public"."messages";

-- Re-create full CRUD policies
CREATE POLICY "Allow select messages for authenticated users"
ON "public"."messages"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert messages for authenticated users"
ON "public"."messages"
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update messages for authenticated users"
ON "public"."messages"
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow delete messages for authenticated users"
ON "public"."messages"
FOR DELETE
TO authenticated
USING (true);
