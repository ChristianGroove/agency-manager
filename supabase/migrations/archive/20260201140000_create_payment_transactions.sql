-- ================================================================
-- PAYMENT TRANSACTIONS TABLE
-- Required for Wompi / Stripe integration logging
-- ================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reference TEXT NOT NULL UNIQUE,
    amount_in_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DECLINED, ERROR
    metadata JSONB DEFAULT '{}'::jsonb,
    invoice_ids UUID[] DEFAULT NULL, -- Optional link to invoices
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by reference (Webhook usage)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_org ON payment_transactions(organization_id);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies (Admins can view their own org transactions)
DROP POLICY IF EXISTS "Admins can view own transactions" ON payment_transactions;
CREATE POLICY "Admins can view own transactions" ON payment_transactions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Only System/Admin can insert/update (via Service Role usually, but good to have safety)
-- In this architecture, we use supabaseAdmin (Service Role) for creation, so RLS doesn't block it.
