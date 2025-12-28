-- Field Services & Workforce Schema
-- Migration ID: 20251228_field_services_schema

-- 1. Create Location Type ENUM
DO $$ BEGIN
    CREATE TYPE location_type_enum AS ENUM ('at_headquarters', 'at_client_address', 'remote');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update Appointments Table (The "Demand")
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS location_type location_type_enum DEFAULT 'at_headquarters',
ADD COLUMN IF NOT EXISTS address_text TEXT,
ADD COLUMN IF NOT EXISTS gps_coordinates JSONB; -- Format: { "lat": number, "lng": number }

-- 3. Create Staff Profiles Table (The "Supply")
-- Linked to organization_members to leverage existing role/auth structure.
-- One member can be a "staff" in the org context.

CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- Link to the specific member record to ensure they are actually in the org
    member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    -- Denormalized user_id for easier RLS and queries
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    hourly_rate NUMERIC(10, 2) DEFAULT 0 CHECK (hourly_rate >= 0),
    skills TEXT[] DEFAULT '{}', -- E.g. ["Deep Cleaning", "Gardening"]
    color TEXT DEFAULT '#3b82f6', -- Hex color for UI/Calendar
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(organization_id, user_id), -- One profile per user per org
    UNIQUE(member_id)
);

-- 4. Enable RLS on Staff Profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: View - Members of the same organization can view staff profiles
CREATE POLICY "View staff profiles of own organization" 
ON staff_profiles FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Policy: Manage - Only Admins/Owners can manage staff profiles
CREATE POLICY "Manage staff profiles (Admin/Owner)" 
ON staff_profiles FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- 5. Trigger for updated_at
CREATE TRIGGER update_staff_profiles_modtime
    BEFORE UPDATE ON staff_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 6. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_staff_profiles_org ON staff_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_gps ON appointments USING gin(gps_coordinates); -- For future spatial queries if needed (JSONB operators)
