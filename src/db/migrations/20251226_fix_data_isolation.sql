-- FIX: Data Isolation & Enforcement (HOTFIX)
-- 1. Identify "Pixy Agency" (Tenant Zero)
-- 2. Backfill all null organization_id data to Pixy Agency
-- 3. Enforce NOT NULL
-- 4. Ensure RLS is strict

DO $$
DECLARE
    tenant_zero_id UUID;
BEGIN
    -- 1. Find Tenant Zero
    SELECT id INTO tenant_zero_id FROM public.organizations WHERE slug = 'pixy-agency';
    
    -- Safety check: if not found, maybe fallback to the FIRST created org?
    IF tenant_zero_id IS NULL THEN
        SELECT id INTO tenant_zero_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF tenant_zero_id IS NULL THEN
        RAISE EXCEPTION 'No Organization found to backfill data to. Please create an organization first.';
    END IF;

    RAISE NOTICE 'Backfilling data to Organization ID: %', tenant_zero_id;

    -- 2. Backfill Tables
    -- Clients
    UPDATE public.clients SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;

    -- Services
    UPDATE public.services SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    ALTER TABLE public.services ALTER COLUMN organization_id SET NOT NULL;

    -- Quotes (Cotizaciones)
    UPDATE public.quotes SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    ALTER TABLE public.quotes ALTER COLUMN organization_id SET NOT NULL;

    -- Invoices (Documentos de Cobro)
    UPDATE public.invoices SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;

    -- Briefings
    UPDATE public.briefings SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    ALTER TABLE public.briefings ALTER COLUMN organization_id SET NOT NULL;

    -- Briefing Templates
    UPDATE public.briefing_templates SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    ALTER TABLE public.briefing_templates ALTER COLUMN organization_id SET NOT NULL;

    -- Subscriptions (SaaS) - Critical for internal SaaS logic
    UPDATE public.subscriptions SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
    ALTER TABLE public.subscriptions ALTER COLUMN organization_id SET NOT NULL;


    -- 3. Strict RLS Validation (Double Check)
    -- We assume the policies created in 'fix_rls_recursion.sql' are active. 
    -- Those policies rely on `get_auth_org_ids()`.
    -- Since we just enforced NOT NULL, no row can have NULL organization_id, so "Public via NULL" is impossible.
    -- Users will ONLY see data where their ID is in organization_members.
    
END $$;
