-- ============================================
-- VERTICALS SYSTEM ARCHITECTURE
-- Replaces rigid "SaaS Apps" with "Vertical Business OS" logic
-- ============================================

-- 1. VERTICALS TABLE (The Business Types)
CREATE TABLE IF NOT EXISTS public.verticals (
    key TEXT PRIMARY KEY, -- 'agency', 'real_estate', 'legal', etc.
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon key
    settings JSONB DEFAULT '{}'::jsonb, -- Global vertical-specific config
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VERTICAL MODULES (The Strict Operating System)
CREATE TABLE IF NOT EXISTS public.vertical_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vertical_key TEXT NOT NULL REFERENCES public.verticals(key) ON DELETE CASCADE,
    module_key TEXT NOT NULL, -- References system_modules.key (loose coupling to avoid dependency hell if module removed)
    is_core BOOLEAN DEFAULT FALSE, -- Core modules cannot be disabled by user
    is_default_enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vertical_key, module_key)
);

-- 3. ORGANIZATION VERTICAL ASSIGNMENT
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS vertical_key TEXT REFERENCES public.verticals(key);

-- 4. SEED: AGENCY VERTICAL
INSERT INTO public.verticals (key, name, description, icon) VALUES
(
    'agency', 
    'Agencies & Consultancies', 
    'Operating System for Marketing Agencies, Dev Shops, and Consulting Firms.', 
    'Briefcase'
) ON CONFLICT (key) DO NOTHING;

-- 5. SEED: AGENCY MODULES (The Surgical Package)
-- Clearning out any existing mapping for agency to ensure purity
DELETE FROM public.vertical_modules WHERE vertical_key = 'agency';

INSERT INTO public.vertical_modules (vertical_key, module_key, is_core, is_default_enabled, sort_order) VALUES
-- CORE (Essential for operations)
('agency', 'module_crm', TRUE, TRUE, 1),        -- Clients & Leads
('agency', 'module_automation', TRUE, TRUE, 2), -- Workflows
('agency', 'module_messaging', TRUE, TRUE, 3),  -- Inbox/WhatsApp (Assuming key is module_messaging or similar, checking module keys next step)

-- OPERATIONAL (Agency Specific)
('agency', 'module_projects', FALSE, TRUE, 4),   -- Briefings/Projects
('agency', 'module_quotes', FALSE, TRUE, 5),     -- Proposals
('agency', 'module_finance', FALSE, TRUE, 6)     -- Invoicing

-- Note: We rely on 'system_modules' having these keys. 
-- If they strictly use 'module_crm' logic, we are good.
-- Accessing 'module_briefings' as 'module_projects' might be a rename preference, 
-- but let's stick to existing keys found in previous steps: 
-- 'module_crm', 'module_automation', 'module_invoicing', 'module_briefings', 'module_catalog'
;

-- CORRECTING MODULE KEYS BASED ON PREVIOUS FILES
-- Re-inserting with known correct keys from system_modules
DELETE FROM public.vertical_modules WHERE vertical_key = 'agency';

INSERT INTO public.vertical_modules (vertical_key, module_key, is_core, is_default_enabled, sort_order) VALUES
('agency', 'module_crm', TRUE, TRUE, 10),
('agency', 'module_automation', TRUE, TRUE, 20),
-- We assume 'module_messages' exists or similar. Let's start with what we saw in 'enhance_system_modules.sql'
-- plus the implicit core ones.
('agency', 'module_invoicing', FALSE, TRUE, 30),
('agency', 'module_briefings', FALSE, TRUE, 40),
('agency', 'module_catalog', FALSE, FALSE, 50);


-- 6. MIGRATE EXISTING ORG (Force Assignment)
-- Assign the first found organization to 'agency' to immediately switch view
UPDATE public.organizations
SET vertical_key = 'agency'
WHERE vertical_key IS NULL;

-- 7. RLS
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read verticals" ON public.verticals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read vertical modules" ON public.vertical_modules FOR SELECT TO authenticated USING (true);
