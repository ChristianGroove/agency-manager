-- Allow NULL values for next_billing_date to support one-time services
ALTER TABLE public.subscriptions ALTER COLUMN next_billing_date DROP NOT NULL;

-- Update frequency check constraint to include 'one-time'
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_frequency_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_frequency_check 
  CHECK (frequency IN ('monthly', 'yearly', 'one-time'));
