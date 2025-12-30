-- Billing Audit Log - Immutable audit trail
-- PHASE 1: Billing Core implementation

-- Create audit log table
CREATE TABLE IF NOT EXISTS billing_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Action
    action TEXT NOT NULL,
    document_id UUID,
    
    -- Context
    user_id UUID,
    organization_id UUID NOT NULL,
    
    -- State changes
    before JSONB,
    after JSONB,
    changes TEXT[],
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    source TEXT CHECK (source IN ('WEB', 'API', 'CRON', 'EXTERNAL')) NOT NULL,
    
    -- Immutability chain (blockchain-like)
    hash TEXT NOT NULL,
    previous_hash TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_document_id ON billing_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_organization ON billing_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON billing_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON billing_audit_log(user_id);

-- Prevent updates and deletes (immutability)
CREATE OR REPLACE RULE no_update_audit AS
    ON UPDATE TO billing_audit_log
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_audit AS
    ON DELETE TO billing_audit_log
    DO INSTEAD NOTHING;

-- RLS Policies
ALTER TABLE billing_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only insert entries for their organization
CREATE POLICY "Users can insert audit logs for their org"
    ON billing_audit_log
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Users can only read audit logs from their organization
CREATE POLICY "Users can read audit logs from their org"
    ON billing_audit_log
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Function to calculate hash
CREATE OR REPLACE FUNCTION calculate_audit_hash(
    p_id UUID,
    p_timestamp TIMESTAMPTZ,
    p_action TEXT,
    p_document_id UUID,
    p_organization_id UUID,
    p_previous_hash TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_previous_hash, '') ||
            p_id::TEXT ||
            p_timestamp::TEXT ||
            p_action ||
            COALESCE(p_document_id::TEXT, '') ||
            p_organization_id::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate hash on insert
CREATE OR REPLACE FUNCTION set_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    v_previous_hash TEXT;
BEGIN
    -- Get previous hash for this organization
    SELECT hash INTO v_previous_hash
    FROM billing_audit_log
    WHERE organization_id = NEW.organization_id
    ORDER BY timestamp DESC, id DESC
    LIMIT 1;
    
    -- Calculate and set hash
    NEW.hash := calculate_audit_hash(
        NEW.id,
        NEW.timestamp,
        NEW.action,
        NEW.document_id,
        NEW.organization_id,
        v_previous_hash  
    );
    
    NEW.previous_hash := v_previous_hash;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_audit_hash
    BEFORE INSERT ON billing_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_hash();

-- Partition by month for performance (optional, for future)
-- Can be enabled later as volume grows

COMMENT ON TABLE billing_audit_log IS 'Immutable audit trail for billing operations. No updates or deletes allowed.';
COMMENT ON COLUMN billing_audit_log.hash IS 'SHA-256 hash of entry + previous hash (blockchain-like chain)';
COMMENT ON COLUMN billing_audit_log.previous_hash IS 'Hash of previous entry in chain for this organization';
