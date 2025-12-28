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
