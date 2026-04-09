-- ============================================
-- FASE 8: CORE WORK ORDERS (Destructive Migration)
-- Date: 2026-01-02
-- Description: Unification of operations/jobs into a single 'work_orders' table.
-- WARNING: This drops legacy cleaning tables and data.
-- ============================================

-- 1. Drop Legacy Tables
DROP TABLE IF EXISTS public.cleaning_staff_availability CASCADE;
DROP TABLE IF EXISTS public.cleaning_staff_profiles CASCADE;
DROP TABLE IF EXISTS public.cleaning_services CASCADE;
-- We rename appointments to work_orders to signify the shift, or drop and recreate if schema is too different.
-- Let's drop and recreate to be clean.
DROP TABLE IF EXISTS public.appointments CASCADE;

-- 2. Create Universal Work Orders Table
CREATE TABLE public.work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Relationships
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL, -- Link to Universal Catalog
    form_submission_id UUID, -- Optional link to a briefing/form
    
    -- Assignees (Array for multi-staff support, or keep simple for now)
    -- Start with single assignee for simplicity, can expand to junction table later
    assigned_staff_id UUID REFERENCES public.organization_members(user_id) ON DELETE SET NULL, 

    -- Metadata
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, scheduled, in_progress, completed, cancelled, blocked
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Scheduling
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    location_type TEXT DEFAULT 'at_client_address', -- at_client_address, remote, at_office
    location_address TEXT,
    
    -- Vertical/Context (Important for filtering)
    vertical TEXT NOT NULL DEFAULT 'generic', -- cleaning, maintenance, marketing, etc.
    tags TEXT[],
    
    -- Financials (Snapshot)
    price_quoted DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work orders of their organization"
    ON public.work_orders FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins/Owners can insert work orders"
    ON public.work_orders FOR INSERT
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
        AND EXISTS (
             SELECT 1 FROM public.organization_members 
             WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Admins/Owners/Staff can update work orders"
    ON public.work_orders FOR UPDATE
    USING (
        organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins/Owners can delete work orders"
    ON public.work_orders FOR DELETE
    USING (
        organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
        AND EXISTS (
             SELECT 1 FROM public.organization_members 
             WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 4. Indexes
CREATE INDEX idx_work_orders_org ON public.work_orders(organization_id);
CREATE INDEX idx_work_orders_client ON public.work_orders(client_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_start_time ON public.work_orders(start_time);
CREATE INDEX idx_work_orders_vertical ON public.work_orders(vertical);
