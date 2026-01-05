-- Phase 7 Corrected: Data Cleanup & App Publishing
-- Updated to target 'saas_apps' table which drives the UI list.

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
-- We look for an app that looks like an agency app, or insert one if missing.

DO $$
DECLARE
    app_id_val TEXT;
BEGIN
    -- Try to find existing app
    SELECT id INTO app_id_val 
    FROM public.saas_apps 
    WHERE slug LIKE '%agency%' OR name LIKE '%Agency%' LIMIT 1;

    IF app_id_val IS NOT NULL THEN
        -- Update existing
        UPDATE public.saas_apps
        SET 
            name = 'Agencia OS',
            slug = 'agency-os', -- Keeping standard slug
            description = 'Sistema Operativo completo para Agencias Digitales.',
            status = 'published',
            is_active = true,
            price_monthly = 79000
        WHERE id = app_id_val;
    ELSE
        -- Insert new if not found
        INSERT INTO public.saas_apps (id, name, slug, description, category, icon, color, price_monthly, is_active, status, sort_order)
        VALUES (
            'app_agency_os',
            'Agencia OS', 
            'agency-os', 
            'Sistema Operativo completo para Agencias Digitales.',
            'agency',
            'Briefcase',
            '#ec4899',
            79000,
            true,
            'published',
            1
        );
    END IF;

    -- Hide/Draft others
    UPDATE public.saas_apps
    SET is_active = false
    WHERE slug != 'agency-os' AND id != 'app_agency_os';

END $$;
