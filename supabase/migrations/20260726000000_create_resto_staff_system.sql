-- Migration: Create resto staff zone assignments system
-- Description: Links staff members to restaurant zones and adds waiter tracking to table sessions

-- ============================================================================
-- 1. Create resto_staff_zone_assignments table (staff ↔ zones junction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS resto_staff_zone_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES organization_staff(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES resto_zones(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_staff_zone UNIQUE (staff_id, zone_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_resto_staff_zone_assignments_organization_id
    ON resto_staff_zone_assignments(organization_id);

CREATE INDEX IF NOT EXISTS idx_resto_staff_zone_assignments_staff_id
    ON resto_staff_zone_assignments(staff_id);

CREATE INDEX IF NOT EXISTS idx_resto_staff_zone_assignments_zone_id
    ON resto_staff_zone_assignments(zone_id);

-- Enable Row Level Security
ALTER TABLE resto_staff_zone_assignments ENABLE ROW LEVEL SECURITY;

-- Safe creation of RLS policies using DO block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'resto_staff_zone_assignments' 
          AND policyname = 'org_members_all_resto_staff_zone_assignments'
    ) THEN
        CREATE POLICY "org_members_all_resto_staff_zone_assignments"
            ON resto_staff_zone_assignments
            FOR ALL
            USING (
                organization_id IN (
                    SELECT om.organization_id
                    FROM organization_members om
                    WHERE om.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'resto_staff_zone_assignments' 
          AND policyname = 'public_select_resto_staff_zone_assignments'
    ) THEN
        CREATE POLICY "public_select_resto_staff_zone_assignments"
            ON resto_staff_zone_assignments
            FOR SELECT
            USING (true);
    END IF;
END $$;

-- ============================================================================
-- 2. Add waiter_id column to resto_table_sessions
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'resto_table_sessions'
          AND column_name = 'waiter_id'
    ) THEN
        ALTER TABLE resto_table_sessions
            ADD COLUMN waiter_id UUID REFERENCES organization_staff(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Comment explaining the distinction between waiter_id and opened_by
COMMENT ON COLUMN resto_table_sessions.waiter_id IS
    'The waiter assigned to serve this table session. May differ from opened_by, '
    'which represents the staff member who physically opened/created the session.';

-- Index for efficient waiter lookups
CREATE INDEX IF NOT EXISTS idx_resto_table_sessions_waiter_id
    ON resto_table_sessions(waiter_id);
