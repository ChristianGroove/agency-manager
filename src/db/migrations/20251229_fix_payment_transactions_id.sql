-- FIX: Add default value to payment_transactions.id
-- It seems the table was created without 'DEFAULT gen_random_uuid()'

DO $$ 
BEGIN
    -- Check if it's uuid
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_transactions' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE payment_transactions 
        ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;
