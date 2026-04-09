-- Enable RLS on payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view payment transactions if they are a member of the organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_transactions' 
        AND policyname = 'Users can view transactions of their organization'
    ) THEN
        CREATE POLICY "Users can view transactions of their organization" 
        ON payment_transactions 
        FOR SELECT 
        USING (
            organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;
