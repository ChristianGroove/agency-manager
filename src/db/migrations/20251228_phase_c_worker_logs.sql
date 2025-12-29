-- Job Time Logs for Phase C (Worker App)
-- Tracks actual execution time vs scheduled time.

CREATE TABLE IF NOT EXISTS job_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evidence
    gps_lat NUMERIC,
    gps_lng NUMERIC,
    photo_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE job_time_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can insert own logs" 
ON job_time_logs FOR INSERT 
WITH CHECK (
    staff_id IN (
        SELECT id FROM staff_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Staff can view own logs" 
ON job_time_logs FOR SELECT 
USING (
    staff_id IN (
        SELECT id FROM staff_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all logs" 
ON job_time_logs FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);
