-- Cleaning App 2.0 - Core Engine Upgrade
-- Migration ID: 20251228_cleaning_2_0_schema

-- 1. Upgrade Services Table (Advanced Catalog)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60, -- Standard duration for scheduling
ADD COLUMN IF NOT EXISTS pricing_model TEXT CHECK (pricing_model IN ('fixed', 'hourly', 'sq_meter')) DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS worker_count INTEGER DEFAULT 1; -- How many people needed

-- 2. Staff Shifts (Workforce Availability)
-- Defines weekly recurring availability or specific overrides
CREATE TABLE IF NOT EXISTS staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_staff_day_shift UNIQUE (staff_id, day_of_week, start_time)
);

-- RLS for Shifts
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shifts of their org" ON staff_shifts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins/Owners can manage shifts" ON staff_shifts
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
