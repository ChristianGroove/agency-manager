-- Migration: Enhance Appointments for Cleaning Vertical
-- ID: 20251228_enhance_appointments_for_cleaning

-- 1. Add Service Link and Vertical Context
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES cleaning_services(id),
ADD COLUMN IF NOT EXISTS service_vertical TEXT DEFAULT 'generic'; -- 'cleaning', 'agency', etc.

-- 2. Index for faster filtering by vertical
CREATE INDEX IF NOT EXISTS idx_appointments_vertical ON appointments(service_vertical);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);

-- 3. Comment
COMMENT ON COLUMN appointments.service_id IS 'Link to specific vertical service (e.g., cleaning_services)';
COMMENT ON COLUMN appointments.service_vertical IS 'Identifier for the vertical this appointment belongs to';
