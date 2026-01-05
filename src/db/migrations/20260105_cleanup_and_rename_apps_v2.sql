-- Phase 7 Corrected (V2): Data Cleanup & App Publishing
-- Removed 'status' column as it doesn't exist in DB.

-- 1. Clean up Test Organizations (Preserve 'pixy-agency')
DELETE FROM public.organizations 
WHERE slug != 'pixy-agency';

-- 2. Ensure Tenant Zero is correct
UPDATE public.organizations
SET 
    organization_type = 'platform',
    status = 'active',
    name = 'Pixy Agency'
WHERE slug = 'pixy-agency';

-- 3. Publish "Agencia OS" in 'saas_apps'
DO $$
DECLARE
    target_id TEXT;
BEGIN
    SELECT id INTO target_id FROM public.saas_apps WHERE slug LIKE '%agency%' OR name LIKE '%Agency%' LIMIT 1;
    
    IF target_id IS NOT NULL THEN
        UPDATE public.saas_apps
        SET 
            name = 'Agencia OS', 
            slug = 'agency-os', 
            -- status column removed
            is_active = true, 
            price_monthly = 79000
        WHERE id = target_id;
    ELSE
        INSERT INTO public.saas_apps (id, name, slug, description, category, is_active, price_monthly, sort_order, icon, color)
        VALUES ('app_agency_os', 'Agencia OS', 'agency-os', 'Sistema Operativo completo.', 'agency', true, 79000, 1, 'Briefcase', '#ec4899');
    END IF;

    -- Ocultar otros
    UPDATE public.saas_apps SET is_active = false WHERE slug != 'agency-os' AND id != 'app_agency_os';
END $$;
