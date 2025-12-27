-- Add Super Admin Portal Mode
-- Allows specific organizations (like Pixy Agency) to show ALL portal modules

-- 1. Add flag to organization_settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS show_all_portal_modules BOOLEAN DEFAULT false;

-- 2. Enable full portal access for Pixy Agency
-- Update based on organization name or ID (adjust as needed)
UPDATE public.organization_settings
SET show_all_portal_modules = true
WHERE organization_id IN (
    SELECT id FROM public.organizations 
    WHERE name ILIKE '%pixy%agency%' OR name = 'Pixy Agency'
    LIMIT 1
);

-- 3. Verify configuration
SELECT 
    o.name as organization_name,
    os.show_all_portal_modules
FROM public.organizations o
JOIN public.organization_settings os ON o.id = os.organization_id
WHERE os.show_all_portal_modules = true;
