-- Drop potential conflicting policies
DROP POLICY IF EXISTS "Admin can manage emitters" ON public.emitters;
DROP POLICY IF EXISTS "Authenticated users can manage emitters" ON public.emitters;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.emitters;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.emitters;

-- Create a robust policy for Authenticated Users
-- This allows any logged-in user (Agency Admin) to View, Create, Update, and Delete emitters.
CREATE POLICY "Authenticated users can manage emitters"
ON public.emitters
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.emitters ENABLE ROW LEVEL SECURITY;

-- Reload Schema (Just in case)
NOTIFY pgrst, 'reload config';
