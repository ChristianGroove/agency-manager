-- Add organization_id to payment_transactions for multi-tenancy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_transactions' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE payment_transactions 
        ADD COLUMN organization_id UUID REFERENCES organizations(id);
        
        CREATE INDEX idx_payment_transactions_org_id ON payment_transactions(organization_id);
    END IF;
END $$;
