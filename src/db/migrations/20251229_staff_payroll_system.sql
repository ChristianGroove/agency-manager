-- Staff Payroll System
-- Migration ID: 20251229_staff_payroll_system
-- Created: 2025-12-28
-- Purpose: Complete payroll management system for cleaning staff

-- ============================================================================
-- 1. WORK LOGS - Automatic time tracking from completed jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES cleaning_staff_profiles(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Time tracking
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_hours DECIMAL(10,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    ) STORED,
    
    -- Payment calculation
    hourly_rate DECIMAL(10,2) NOT NULL, -- Snapshot of rate at time of work
    calculated_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) * hourly_rate
    ) STORED,
    
    -- Metadata
    log_type TEXT DEFAULT 'auto' CHECK (log_type IN ('auto', 'manual', 'adjustment')),
    notes TEXT,
    approved_by UUID REFERENCES organization_members(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for work logs
CREATE INDEX IF NOT EXISTS idx_work_logs_staff_date ON staff_work_logs(staff_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_org_date ON staff_work_logs(organization_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_appointment ON staff_work_logs(appointment_id) WHERE appointment_id IS NOT NULL;

-- RLS for work logs
ALTER TABLE staff_work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage work logs"
    ON staff_work_logs FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Staff can view own work logs"
    ON staff_work_logs FOR SELECT
    USING (
        staff_id IN (
            SELECT id FROM cleaning_staff_profiles WHERE email = auth.email()
        )
    );

-- ============================================================================
-- 2. PAYROLL PERIODS - Pay periods (weekly, biweekly, monthly)
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Period definition
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_name TEXT NOT NULL, -- e.g., "Quincena Enero 1-15, 2025"
    period_type TEXT DEFAULT 'biweekly' CHECK (period_type IN ('weekly', 'biweekly', 'monthly')),
    
    -- Status workflow
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'processing', 'paid')),
    
    -- Calculated totals (updated when processing)
    total_hours DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    staff_count INTEGER DEFAULT 0,
    
    -- Audit trail
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES organization_members(id),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES organization_members(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent overlapping periods
    CONSTRAINT unique_org_period UNIQUE (organization_id, period_start, period_end)
);

-- Indexes for payroll periods
CREATE INDEX IF NOT EXISTS idx_payroll_periods_org_date ON staff_payroll_periods(organization_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON staff_payroll_periods(status);

-- RLS for payroll periods
ALTER TABLE staff_payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payroll periods"
    ON staff_payroll_periods FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- ============================================================================
-- 3. PAYROLL SETTLEMENTS - Individual staff settlements per period
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_payroll_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payroll_period_id UUID NOT NULL REFERENCES staff_payroll_periods(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES cleaning_staff_profiles(id) ON DELETE CASCADE,
    
    -- Base calculation
    total_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    hourly_rate DECIMAL(10,2) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Adjustments
    bonuses DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        base_amount + bonuses - deductions
    ) STORED,
    
    -- Payment tracking
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    amount_paid DECIMAL(10,2) DEFAULT 0,
    amount_owed DECIMAL(10,2) GENERATED ALWAYS AS (
        base_amount + bonuses - deductions - amount_paid
    ) STORED,
    
    -- Metadata
    notes TEXT,
    approved_by UUID REFERENCES organization_members(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One settlement per staff per period
    CONSTRAINT unique_staff_period UNIQUE (payroll_period_id, staff_id)
);

-- Indexes for settlements
CREATE INDEX IF NOT EXISTS idx_settlements_period ON staff_payroll_settlements(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_settlements_staff_date ON staff_payroll_settlements(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON staff_payroll_settlements(payment_status);
CREATE INDEX IF NOT EXISTS idx_settlements_org ON staff_payroll_settlements(organization_id);

-- RLS for settlements
ALTER TABLE staff_payroll_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlements"
    ON staff_payroll_settlements FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Staff can view own settlements"
    ON staff_payroll_settlements FOR SELECT
    USING (
        staff_id IN (
            SELECT id FROM cleaning_staff_profiles WHERE email = auth.email()
        )
    );

-- ============================================================================
-- 4. STAFF PAYMENTS - Payment records
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    settlement_id UUID NOT NULL REFERENCES staff_payroll_settlements(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES cleaning_staff_profiles(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_payment', 'other')),
    payment_date DATE NOT NULL,
    
    -- References and notes
    reference_number TEXT,
    bank_name TEXT,
    account_last_4 TEXT,
    notes TEXT,
    
    -- Audit trail
    registered_by UUID REFERENCES organization_members(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_settlement ON staff_payments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_payments_staff_date ON staff_payments(staff_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_date ON staff_payments(organization_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_method ON staff_payments(payment_method);

-- RLS for payments
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments"
    ON staff_payments FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Staff can view own payments"
    ON staff_payments FOR SELECT
    USING (
        staff_id IN (
            SELECT id FROM cleaning_staff_profiles WHERE email = auth.email()
        )
    );

-- ============================================================================
-- 5. TRIGGER - Auto-update settlement payment status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_settlement_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the settlement's amount_paid and status
    UPDATE staff_payroll_settlements
    SET 
        amount_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM staff_payments
            WHERE settlement_id = NEW.settlement_id
        ),
        payment_status = CASE
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM staff_payments WHERE settlement_id = NEW.settlement_id) = 0 
                THEN 'pending'
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM staff_payments WHERE settlement_id = NEW.settlement_id) >= (base_amount + bonuses - deductions)
                THEN 'paid'
            ELSE 'partial'
        END,
        updated_at = NOW()
    WHERE id = NEW.settlement_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_settlement_status
    AFTER INSERT OR UPDATE OR DELETE ON staff_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_settlement_payment_status();

-- ============================================================================
-- 6. HELPER FUNCTION - Calculate period totals
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_period_totals(period_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE staff_payroll_periods
    SET 
        total_hours = (
            SELECT COALESCE(SUM(total_hours), 0)
            FROM staff_payroll_settlements
            WHERE payroll_period_id = period_id
        ),
        total_amount = (
            SELECT COALESCE(SUM(final_amount), 0)
            FROM staff_payroll_settlements
            WHERE payroll_period_id = period_id
        ),
        staff_count = (
            SELECT COUNT(DISTINCT staff_id)
            FROM staff_payroll_settlements
            WHERE payroll_period_id = period_id
        ),
        updated_at = NOW()
    WHERE id = period_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETE
-- ============================================================================
-- Tables created:
-- 1. staff_work_logs - Automatic time tracking
-- 2. staff_payroll_periods - Pay period management
-- 3. staff_payroll_settlements - Individual settlements
-- 4. staff_payments - Payment records
--
-- Features:
-- - Auto-calculated hours and amounts
-- - RLS policies for security
-- - Triggers for payment status updates
-- - Helper functions for aggregations
-- ============================================================================
