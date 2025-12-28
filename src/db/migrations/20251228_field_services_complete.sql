-- Field Services Complete Schema (Consolidated & Fixed)
-- Migration ID: 20251228_field_services_complete
-- Fixed: Adds 'id' to organization_members to support FK references

-- 0. PRE-FLIGHT FIX: Ensure organization_members has an ID
-- Many tables/code rely on a single 'id' for members, but original schema used composite PK.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_members' AND column_name = 'id') THEN
        ALTER TABLE organization_members ADD COLUMN id UUID DEFAULT uuid_generate_v4();
        -- Identify unique constraint if needed, but PK remains (organization_id, user_id) for now or we create a unique index on ID
        CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_id ON organization_members(id);
    END IF;
END $$;


-- 1. Create Enums (Idempotent)
DO $$ BEGIN
    CREATE TYPE location_type_enum AS ENUM ('at_headquarters', 'at_client_address', 'remote');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status_enum AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 2. Create Staff Profiles Table (The "Supply") 
-- Now safely references organization_members(id)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    hourly_rate NUMERIC(10, 2) DEFAULT 0 CHECK (hourly_rate >= 0),
    skills TEXT[] DEFAULT '{}',
    color TEXT DEFAULT '#3b82f6',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, user_id),
    UNIQUE(member_id)
);


-- 3. Create or Update Appointments Table (The "Demand")
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL, 
    
    title TEXT NOT NULL,
    description TEXT,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    status appointment_status_enum DEFAULT 'pending',
    
    -- Field Services Context
    location_type location_type_enum DEFAULT 'at_headquarters',
    address_text TEXT,
    gps_coordinates JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 5. Policies 

-- Staff Profiles Policies
DROP POLICY IF EXISTS "View staff profiles of own organization" ON staff_profiles;
CREATE POLICY "View staff profiles of own organization" 
ON staff_profiles FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Manage staff profiles (Admin/Owner)" ON staff_profiles;
CREATE POLICY "Manage staff profiles (Admin/Owner)" 
ON staff_profiles FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Appointments Policies
DROP POLICY IF EXISTS "View appointments of own organization" ON appointments;
CREATE POLICY "View appointments of own organization" 
ON appointments FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Manage appointments of own organization" ON appointments;
CREATE POLICY "Manage appointments of own organization" 
ON appointments FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'member')
    )
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_staff_profiles_org ON staff_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);

-- 7. SEED DATA: Cleaning App Product Bundle
-- This ensures it appears in the "Create Organization" dropdown.
DO $$ 
DECLARE 
    v_product_id UUID;
    mod_wf UUID;
    mod_ops UUID;
    mod_appt UUID;
    mod_client UUID;
    mod_sett UUID; 
BEGIN
    -- A. Ensure Modules Exist (Idempotent)
    INSERT INTO system_modules (key, name, description, category, is_active)
    VALUES
        ('module_workforce', 'Gestión de Personal', 'Permite configurar tarifas y skills del staff.', 'addon', true),
        ('module_field_ops', 'Operaciones de Campo', 'Mapa y Timeline de servicios.', 'addon', true),
        ('module_appointments', 'Citas y Reservas', 'Gestión base de citas con contexto espacial.', 'core', true)
    ON CONFLICT (key) DO UPDATE SET is_active = true;

    -- B. Create Product
    INSERT INTO saas_products (name, slug, description, pricing_model, base_price, status)
    VALUES ('Cleaning Vertical', 'cleaning-app', 'Solución llave en mano para empresas de limpieza.', 'subscription', 29.00, 'published')
    ON CONFLICT (slug) DO UPDATE SET 
        base_price = 29.00,
        description = 'Solución llave en mano para empresas de limpieza.'
    RETURNING id INTO v_product_id;

    -- C. Resolve IDs
    SELECT id INTO mod_wf FROM system_modules WHERE key = 'module_workforce';
    SELECT id INTO mod_ops FROM system_modules WHERE key = 'module_field_ops';
    SELECT id INTO mod_appt FROM system_modules WHERE key = 'module_appointments';
    -- Core modules usually exist from initial seed, if not, we skip linking
    SELECT id INTO mod_client FROM system_modules WHERE key = 'core_clients';
    SELECT id INTO mod_sett FROM system_modules WHERE key = 'core_settings';

    -- D. Link Modules
    INSERT INTO saas_product_modules (product_id, module_id, is_default_enabled)
    VALUES 
        (v_product_id, mod_wf, true),
        (v_product_id, mod_ops, true),
        (v_product_id, mod_appt, true)
    ON CONFLICT (product_id, module_id) DO NOTHING;
    
    IF mod_client IS NOT NULL THEN
        INSERT INTO saas_product_modules (product_id, module_id, is_default_enabled)
        VALUES (v_product_id, mod_client, true)
        ON CONFLICT (product_id, module_id) DO NOTHING;
    END IF;

    RAISE NOTICE 'Cleaning App Product Created/Updated with ID: %', v_product_id;
END $$;

