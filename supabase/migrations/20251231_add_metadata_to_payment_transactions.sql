-- Add metadata column to payment_transactions for storing notes and extra info
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payment_transactions'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE payment_transactions
        ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;
