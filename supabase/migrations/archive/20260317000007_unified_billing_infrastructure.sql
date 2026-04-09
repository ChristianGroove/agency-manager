-- ========================================================
-- UNIFIED BILLING INFRASTRUCTURE (V2.1)
-- Date: 2026-03-17
-- This migration consolidates previous attempts and ensures 
-- all columns and tables exist correctly for Platform Invoicing.
-- ========================================================

-- 1. Extend saas_platform_invoices with missing fields
ALTER TABLE public.saas_platform_invoices 
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS include_tax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 19.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS amount_subtotal DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS client_tax_id TEXT,
ADD COLUMN IF NOT EXISTS client_address TEXT,
ADD COLUMN IF NOT EXISTS client_legal_name TEXT;

-- 2. Create Organization Billing Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.organization_billing_profiles (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    tax_id TEXT, -- NIT / CC
    legal_name TEXT, -- Razón Social
    address TEXT,
    phone TEXT,
    email TEXT, -- Facturación
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for billing profiles
ALTER TABLE public.organization_billing_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (SuperAdmin & Org Members)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'SuperAdmins can manage all billing profiles') THEN
        CREATE POLICY "SuperAdmins can manage all billing profiles"
        ON public.organization_billing_profiles FOR ALL TO authenticated
        USING ((auth.jwt() ->> 'platform_role') = 'super_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Org members can manage their own billing profile') THEN
        CREATE POLICY "Org members can manage their own billing profile"
        ON public.organization_billing_profiles FOR ALL TO authenticated
        USING (organization_id IN (
            SELECT om.organization_id FROM public.organization_members om 
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        ));
    END IF;
END $$;

-- 3. Data Migration: Persist recipient_email from billing profiles (best effort)
UPDATE public.saas_platform_invoices spi
SET recipient_email = obp.email
FROM public.organization_billing_profiles obp
WHERE spi.organization_id = obp.organization_id
AND spi.recipient_email IS NULL
AND obp.email IS NOT NULL;
