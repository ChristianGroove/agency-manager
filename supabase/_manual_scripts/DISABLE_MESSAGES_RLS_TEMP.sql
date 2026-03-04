-- TEMPORARILY DISABLE RLS ON MESSAGES TO TEST
-- This is for debugging only, we'll re-enable it after confirming the issue

-- Disable RLS
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'messages';
