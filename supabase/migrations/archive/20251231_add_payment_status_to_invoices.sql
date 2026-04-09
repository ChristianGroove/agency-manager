-- Add payment_status column to invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices'
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE invoices
        ADD COLUMN payment_status text DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'));

        -- Migrate existing data
        UPDATE invoices
        SET payment_status = CASE
            WHEN status = 'paid' THEN 'PAID'
            WHEN status = 'overdue' THEN 'OVERDUE'
            WHEN status = 'cancelled' THEN 'UNPAID' -- or handled differently?
            ELSE 'UNPAID'
        END;
    END IF;
END $$;
