-- MULTI-TENANT ARCHITECTURE MIGRATION
-- This script transforms the database from a single-tenant to a multi-tenant structure.

-- 1. Create Organizations Table (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    subscription_product_id UUID REFERENCES public.saas_products(id),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Organization Members (Users in Tenants)
CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (organization_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Migration Data: Create Tenant Zero "Pixy Agency"
-- We use a DO block to handle variables (the ID of the new org)
DO $$
DECLARE
    tenant_zero_id UUID;
    member_record RECORD;
BEGIN
    -- Check if it exists or insert (Upserting by slug to avoid duplicates)
    INSERT INTO public.organizations (name, slug, subscription_status)
    VALUES ('Pixy Agency', 'pixy-agency', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO tenant_zero_id;

    -- Assign ALL existing users to this organization as Admins (for retroactivity)
    -- Looping to avoid complex join issues if any, though insert select is fine usually.
    INSERT INTO public.organization_members (organization_id, user_id, role)
    SELECT tenant_zero_id, id, 'owner'
    FROM auth.users
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- 4. Schema Update: Add organization_id to Core Tables
    -- We add the column, set the default to tenant_zero_id to backfill, then remove the default (optional)
    
    -- CLIENTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'organization_id') THEN
        ALTER TABLE public.clients ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        UPDATE public.clients SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
        ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- SERVICES (Portfolio)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'organization_id') THEN
        ALTER TABLE public.services ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        UPDATE public.services SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
        ALTER TABLE public.services ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- QUOTES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'organization_id') THEN
        ALTER TABLE public.quotes ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        UPDATE public.quotes SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
        ALTER TABLE public.quotes ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- INVOICES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'organization_id') THEN
        ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        UPDATE public.invoices SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
        ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- BRIEFINGS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefings' AND column_name = 'organization_id') THEN
        ALTER TABLE public.briefings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        UPDATE public.briefings SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
        ALTER TABLE public.briefings ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- BRIEFING TEMPLATES (Important for assets)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefing_templates' AND column_name = 'organization_id') THEN
        ALTER TABLE public.briefing_templates ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        UPDATE public.briefing_templates SET organization_id = tenant_zero_id WHERE organization_id IS NULL;
        ALTER TABLE public.briefing_templates ALTER COLUMN organization_id SET NOT NULL;
    END IF;

END $$;


-- 5. RLS POLICIES (Tenant Isolation)

-- Helper function to get current user's organizations
CREATE OR REPLACE FUNCTION public.get_auth_org_ids()
RETURNS TABLE (organization_id UUID) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;


-- ORGANIZATION READ POLICIES
-- Members can read their own organization details
CREATE POLICY "Members can view their own organization" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- Members can see other members of their organization
CREATE POLICY "Members can view other members" ON public.organization_members
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );


-- DATA TABLE POLICIES (The "Golden Rule")

-- CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.clients;
CREATE POLICY "Tenant Isolation" ON public.clients
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- SERVICES
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.services;
CREATE POLICY "Tenant Isolation" ON public.services
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- QUOTES
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.quotes;
CREATE POLICY "Tenant Isolation" ON public.quotes
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.invoices;
CREATE POLICY "Tenant Isolation" ON public.invoices
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- BRIEFINGS
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.briefings;
CREATE POLICY "Tenant Isolation" ON public.briefings
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
    
-- BRIEFING TEMPLATES
ALTER TABLE public.briefing_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.briefing_templates;
CREATE POLICY "Tenant Isolation" ON public.briefing_templates
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
