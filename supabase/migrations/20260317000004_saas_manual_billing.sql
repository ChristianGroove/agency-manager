-- ================================================================
-- SAAS PLATFORM INVOICING (MANUAL BILLING)
-- This system is for Pixy -> Organization billing only.
-- ================================================================

-- 1. Create a sequence for PIXY numbers
CREATE SEQUENCE IF NOT EXISTS saas_platform_invoice_seq START 1;

-- 2. Create the platform invoices table
CREATE TABLE IF NOT EXISTS saas_platform_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE, -- PIXY-XXXX
    sequential_number INTEGER NOT NULL,
    
    -- Financial details
    amount_total DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    
    -- Legal Metadata (Colombian Requirements)
    issuer_name TEXT NOT NULL DEFAULT 'Cristian Camilo Gomez Penagos',
    issuer_nit TEXT NOT NULL DEFAULT '1110458437',
    issuer_location TEXT NOT NULL DEFAULT 'Ibague, Colombia',
    issuer_activity TEXT NOT NULL DEFAULT 'Desarrollo y Licenciamiento de Software',
    
    -- Invoicing details
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    notes TEXT,
    
    -- Links to transactions if paid via Wompi
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Function to automatically generate PIXY-XXXX number
CREATE OR REPLACE FUNCTION generate_saas_platform_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sequential_number := nextval('saas_platform_invoice_seq');
    NEW.invoice_number := 'PIXY-' || LPAD(NEW.sequential_number::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for automatic numbering
DROP TRIGGER IF EXISTS trg_saas_platform_invoice_number ON saas_platform_invoices;
CREATE TRIGGER trg_saas_platform_invoice_number
BEFORE INSERT ON saas_platform_invoices
FOR EACH ROW
EXECUTE FUNCTION generate_saas_platform_invoice_number();

-- 5. Add billing_method to saas_subscriptions to distinguish recurrence
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS billing_method VARCHAR(20) DEFAULT 'AUTOMATIC'; -- AUTOMATIC, MANUAL

-- 6. Enable RLS (Security)
ALTER TABLE saas_platform_invoices ENABLE ROW LEVEL SECURITY;

-- Platform Admins (Super Admins) have full access
CREATE POLICY "Super admins can manage platform invoices"
    ON saas_platform_invoices
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND platform_role = 'superadmin'
        )
    );

-- Organizations can ONLY view their own invoices (for their portal history)
CREATE POLICY "Organizations can view their own platform invoices"
    ON saas_platform_invoices
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );
