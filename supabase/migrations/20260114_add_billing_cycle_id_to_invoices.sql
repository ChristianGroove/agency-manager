-- Add billing_cycle_id to invoices table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices'
        AND column_name = 'billing_cycle_id'
    ) THEN
        ALTER TABLE invoices
        ADD COLUMN billing_cycle_id uuid REFERENCES billing_cycles(id) ON DELETE SET NULL;

        CREATE INDEX idx_invoices_billing_cycle_id ON invoices(billing_cycle_id);
    END IF;
END $$;
