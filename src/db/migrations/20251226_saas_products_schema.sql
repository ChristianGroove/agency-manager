-- 1. System Modules (Capabilities Dictionary)
CREATE TABLE IF NOT EXISTS public.system_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('core', 'addon', 'special')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SaaS Products (Commercial Bundles)
CREATE TABLE IF NOT EXISTS public.saas_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    pricing_model TEXT NOT NULL CHECK (pricing_model IN ('subscription', 'one_time')),
    base_price NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Product Modules (The Recipe)
CREATE TABLE IF NOT EXISTS public.saas_product_modules (
    product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.system_modules(id) ON DELETE CASCADE,
    is_default_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (product_id, module_id)
);

-- RLS Policies
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_product_modules ENABLE ROW LEVEL SECURITY;

-- Anonymous/Public Read Access (Catalog is open)
CREATE POLICY "Public read access" ON public.system_modules FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.saas_products FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.saas_product_modules FOR SELECT USING (true);

-- Admin Write Access (Assuming service_role or admin based auth, keeping it simple for now)
-- You might want to restrict this to specific user roles later.
CREATE POLICY "Admin full access" ON public.system_modules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin full access" ON public.saas_products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin full access" ON public.saas_product_modules FOR ALL USING (auth.role() = 'service_role');


-- SEED DATA: Register Core Modules
INSERT INTO public.system_modules (key, name, description, category, is_active)
VALUES
    ('core_clients', 'Client Management', 'CRM core functionality to manage clients and organizations.', 'core', true),
    ('core_services', 'Service Contracts', 'Management of services, pricing, and contract terms.', 'core', true),
    ('module_invoicing', 'Invoicing & Payments', 'Generate invoices, track payments, and manage billing.', 'addon', true),
    ('module_briefings', 'Briefing System', 'Advanced forms and data collection wizard for client onboarding.', 'addon', true),
    ('module_catalog', 'Product Catalog', 'Public facing catalog for services and products.', 'addon', true)
ON CONFLICT (key) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;
