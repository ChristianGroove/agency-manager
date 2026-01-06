-- ============================================
-- WHITELABEL AS PREMIUM MODULE
-- NOT included in any vertical by default
-- Must be manually activated per organization
-- ============================================

-- 1. Ensure the module exists in system_modules as PREMIUM
INSERT INTO public.system_modules (key, name, description, category, is_active, is_premium, price_monthly)
VALUES (
    'module_whitelabel', 
    'Marca Blanca (Whitelabel)', 
    'Personalización completa de branding: logos, colores, dominio personalizado.',
    'addon',
    true,
    true,  -- PREMIUM FLAG
    29.99  -- Suggested monthly price
) ON CONFLICT (key) DO UPDATE SET
    is_premium = EXCLUDED.is_premium,
    price_monthly = EXCLUDED.price_monthly,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. Ensure whitelabel is NOT in any vertical by default
DELETE FROM public.vertical_modules 
WHERE module_key = 'module_whitelabel';

-- 3. Activate whitelabel for Pixy-Agency (platform owner)
-- This uses the manual_module_overrides JSONB array
UPDATE public.organizations
SET manual_module_overrides = 
    CASE 
        WHEN manual_module_overrides IS NULL THEN '["module_whitelabel"]'::jsonb
        WHEN NOT (manual_module_overrides @> '"module_whitelabel"') 
            THEN manual_module_overrides || '"module_whitelabel"'::jsonb
        ELSE manual_module_overrides
    END
WHERE slug = 'pixy-agency';
