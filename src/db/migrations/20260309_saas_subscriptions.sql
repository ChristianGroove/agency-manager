-- Migration: Create saas_subscriptions table
-- Description: Core table for managing platform-level organization subscriptions.
-- Author: Antigravity
-- Date: 2026-03-09

-- 1. Create Subscription Status Enum
DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'legacy_manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create saas_subscriptions table
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.saas_products(id),
    status public.subscription_status DEFAULT 'active',
    
    -- Billing Period
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    
    -- Payment Details (Tokenized)
    payment_gateway TEXT NOT NULL DEFAULT 'wompi' CHECK (payment_gateway IN ('wompi', 'stripe', 'manual')),
    payment_method_id TEXT, -- Wompi Token or Stripe PM ID
    
    -- Metadata & Error tracking
    last_payment_at TIMESTAMP WITH TIME ZONE,
    last_payment_error JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: Only one active/past_due subscription per organization
    CONSTRAINT unique_active_subscription UNIQUE (organization_id)
);

-- 3. Enable RLS
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Org Admins can view their own subscription
CREATE POLICY "Admins can view their organization subscription" ON public.saas_subscriptions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = saas_subscriptions.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

-- SuperAdmin has full access
CREATE POLICY "SuperAdmins full access" ON public.saas_subscriptions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_org_id ON public.saas_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status ON public.saas_subscriptions(status);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.saas_subscriptions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();
