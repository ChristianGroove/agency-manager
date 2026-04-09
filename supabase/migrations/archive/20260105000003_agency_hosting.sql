-- MIGRATION: Agency Hosting & Contracts Ecosystem

-- 1. Create hosting_accounts table
DROP TABLE IF EXISTS public.hosting_accounts CASCADE;
CREATE TABLE IF NOT EXISTS public.hosting_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Technical Details
    domain_url TEXT NOT NULL,
    provider_name TEXT, -- e.g. "HostGator", "DigitalOcean"
    server_ip TEXT,
    plan_name TEXT,     -- e.g. "Business 10GB"
    cpanel_url TEXT,
    
    -- Management
    credentials JSONB DEFAULT '{}'::jsonb, -- Store non-sensitive or encrypted data here
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    
    -- Dates
    renewal_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.hosting_accounts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hosting_accounts' AND policyname = 'View own hosting accounts') THEN
        CREATE POLICY "View own hosting accounts" ON public.hosting_accounts
            FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hosting_accounts' AND policyname = 'Manage own hosting accounts') THEN
        CREATE POLICY "Manage own hosting accounts" ON public.hosting_accounts
            FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
    END IF;
END $$;

-- 4. Register Modules
-- Ensure 'module_contracts' and 'module_hosting' exist in system_modules
INSERT INTO public.system_modules (key, name, description, category) VALUES
('module_contracts', 'Gestión de Contratos', 'Administración de acuerdos de servicio recurrentes y únicos.', 'billing'),
('module_hosting', 'Gestión de Hosting', 'Inventario técnico de servidores y dominios de clientes.', 'operations')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 5. Assign to Agency Vertical
-- Contracts is CORE. Hosting is Default Enabled.
INSERT INTO public.vertical_modules (vertical_key, module_key, is_core, is_default_enabled) VALUES
('agency', 'module_contracts', TRUE, TRUE),
('agency', 'module_hosting', FALSE, TRUE)
ON CONFLICT (vertical_key, module_key) DO UPDATE
SET is_core = EXCLUDED.is_core, is_default_enabled = EXCLUDED.is_default_enabled;


