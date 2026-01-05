-- Phase 7: Data Cleanup & Product Renaming

-- 1. Clean up Test Organizations (Preserve 'pixy-agency')
-- WARNING: This deletes data using cascade.
DELETE FROM public.organizations 
WHERE slug != 'pixy-agency';

-- 2. Ensure Tenant Zero is correct
UPDATE public.organizations
SET 
    organization_type = 'platform',
    status = 'active',
    name = 'Pixy Agency'
WHERE slug = 'pixy-agency';

-- 3. Update SaaS Products catalog
-- Rename the main Agency product to "Agencia OS"
-- We assume there is one product related to agencies or we update the generic "Pixy Agency" product
-- Strategy: Find the product currently used by Tenant Zero or just update the first one found or create if missing.

DO $$
DECLARE
    agency_product_id UUID;
BEGIN
    -- Try to find an existing Agency product
    SELECT id INTO agency_product_id 
    FROM public.saas_products 
    WHERE slug LIKE '%agency%' OR name LIKE '%Agency%' LIMIT 1;

    -- If found, update it
    IF agency_product_id IS NOT NULL THEN
        UPDATE public.saas_products
        SET 
            name = 'Agencia OS',
            slug = 'agencia-os',
            description = 'Sistema Operativo completo para Agencias Digitales.',
            status = 'published',
            base_price = 79000
        WHERE id = agency_product_id;
    ELSE
        -- Insert it if not exists
        INSERT INTO public.saas_products (name, slug, pricing_model, base_price, status, description)
        VALUES ('Agencia OS', 'agencia-os', 'subscription', 79000, 'published', 'Sistema Operativo completo para Agencias Digitales.');
    END IF;

    -- Hide all other products (Cleaning, etc)
    UPDATE public.saas_products
    SET status = 'draft'
    WHERE slug != 'agencia-os';

END $$;
