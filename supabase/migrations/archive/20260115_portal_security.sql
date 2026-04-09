-- Portal Security Enhancement Migration
-- Date: 2026-01-15
-- Purpose: Add token expiration support and access logging

-- ============================================
-- 1. ADD TOKEN EXPIRATION COLUMNS TO CLIENTS
-- ============================================

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS portal_token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS portal_token_never_expires boolean DEFAULT true;

-- Backfill: All existing tokens never expire (preserve current behavior)
UPDATE clients 
SET portal_token_never_expires = true 
WHERE portal_token_never_expires IS NULL;

-- ============================================
-- 2. CREATE PORTAL ACCESS LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS portal_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    token_used text NOT NULL,
    ip_address text,
    user_agent text,
    access_type text DEFAULT 'view', -- 'view', 'pay', 'download', 'action'
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_client 
    ON portal_access_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_org 
    ON portal_access_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_created 
    ON portal_access_logs(created_at DESC);

-- ============================================
-- 3. ROW LEVEL SECURITY FOR ACCESS LOGS
-- ============================================

ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view their org's logs
CREATE POLICY "Org members can view portal logs" ON portal_access_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Service role can insert logs (for server actions)
CREATE POLICY "Service role can insert logs" ON portal_access_logs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. HELPER FUNCTION FOR TOKEN VALIDATION
-- ============================================

CREATE OR REPLACE FUNCTION is_portal_token_valid(client_row clients)
RETURNS boolean AS $$
BEGIN
    -- If never_expires is true, always valid
    IF client_row.portal_token_never_expires = true THEN
        RETURN true;
    END IF;
    
    -- If expires_at is null but never_expires is false, invalid config (treat as expired)
    IF client_row.portal_token_expires_at IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check expiration
    RETURN client_row.portal_token_expires_at > now();
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. CLEANUP FUNCTION (Optional, for CRON)
-- ============================================

-- Function to clean old access logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_portal_access_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM portal_access_logs 
    WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;
