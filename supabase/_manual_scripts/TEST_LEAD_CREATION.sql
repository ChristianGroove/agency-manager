-- Quick check: verify RLS isn't blocking lead creation
-- Run this to test if leads can be created

-- Check what happens when we try to create a test lead
INSERT INTO public.leads (
    organization_id,
    phone,
    name,
    status,
    user_id
) 
SELECT 
    id as organization_id,
    '+1234567890' as phone,
    'Test Webhook Lead' as name,
    'new' as status,
    NULL as user_id
FROM public.organizations
LIMIT 1
RETURNING *;

-- If the above fails, user_id might still be required
-- Check the actual column constraints:
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('user_id', 'phone', 'name', 'organization_id');
