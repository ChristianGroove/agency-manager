-- Migration: Add service_id to appointments
-- ID: 20251228_add_service_id_to_appointments
-- Goal: Link appointments to specific services (for cleaning vertical)

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES cleaning_services(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_vertical TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS address_text TEXT,
ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'at_client_address';

-- Also ensure logic for cleaning job creation uses this.
