-- Fix existing leads and conversations to show proper names

-- 1. Update leads without names to use their phone number
UPDATE public.leads
SET name = phone
WHERE (name IS NULL OR name = '') 
AND phone IS NOT NULL;

-- 2. Update conversations to have phone from leads
UPDATE public.conversations c
SET phone = l.phone
FROM public.leads l
WHERE c.lead_id = l.id
AND c.phone IS NULL
AND l.phone IS NOT NULL;

-- 3. Verify the fix
SELECT 
    c.id,
    c.phone as conv_phone,
    l.name as lead_name,
    l.phone as lead_phone,
    c.last_message,
    c.created_at
FROM public.conversations c
LEFT JOIN public.leads l ON c.lead_id = l.id
ORDER BY c.created_at DESC
LIMIT 10;
