CREATE TABLE IF NOT EXISTS public.resto_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    total NUMERIC NOT NULL,
    tip_amount NUMERIC DEFAULT 0,
    resto_mode TEXT NOT NULL CHECK (resto_mode IN ('delivery', 'pickup', 'dine_in')),
    table_id TEXT,
    kitchen_status TEXT NOT NULL DEFAULT 'pending' CHECK (kitchen_status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
    delivery_address TEXT,
    customer_notes TEXT,
    items_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.resto_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for org users" ON public.resto_orders;
CREATE POLICY "Enable all access for org users" ON public.resto_orders
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );
