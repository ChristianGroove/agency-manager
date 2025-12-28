-- Fix: Create Appointments Table
-- Migration ID: 20251228_create_appointments_table

-- 1. Create ENUMs if not exist
DO $$ BEGIN
    CREATE TYPE appointment_status_enum AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE location_type_enum AS ENUM ('at_headquarters', 'at_client_address', 'remote');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL, -- Link to workforce if exists, else generic
    
    title TEXT NOT NULL,
    description TEXT,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    status appointment_status_enum DEFAULT 'pending',
    
    -- Field Services Context
    location_type location_type_enum DEFAULT 'at_headquarters',
    address_text TEXT,
    gps_coordinates JSONB, -- { lat: number, lng: number }
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "View appointments of own organization" 
ON appointments FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Manage appointments of own organization" 
ON appointments FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'member') -- Members can generally view/edit assigned tasks
    )
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time);
