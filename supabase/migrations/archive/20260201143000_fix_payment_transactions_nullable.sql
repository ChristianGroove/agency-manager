-- ================================================================
-- FIX: Relax invoice_ids constraint
-- ================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payment_transactions' 
        AND column_name = 'invoice_ids' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE payment_transactions ALTER COLUMN invoice_ids DROP NOT NULL;
    END IF;
END $$;
