-- FIX: Organization Settings Schema
-- 1. Add organization_id if missing
-- 2. Enable RLS
-- 3. Add Policy

DO $$
DECLARE
    tenant_zero_id UUID;
BEGIN
    SELECT id INTO tenant_zero_id FROM public.organizations WHERE slug = 'pixy-agency';
    IF tenant_zero_id IS NULL THEN
        SELECT id INTO tenant_zero_id FROM public.organizations LIMIT 1;
    END IF;

    -- 1. Add Column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'organization_id') THEN
        ALTER TABLE public.organization_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        
        -- Backfill existing rows (likely only one) to tenant zero
        UPDATE public.organization_settings SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
        
        ALTER TABLE public.organization_settings ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- 2. Enable RLS
    ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

    -- 3. Policy
    DROP POLICY IF EXISTS "Tenant Isolation" ON public.organization_settings;
    CREATE POLICY "Tenant Isolation" ON public.organization_settings
        USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

END $$;
