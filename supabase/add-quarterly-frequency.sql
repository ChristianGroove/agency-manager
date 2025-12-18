-- Add quarterly frequency option to subscriptions table
-- This updates the CHECK constraint to allow 'quarterly' as a valid frequency value

ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_frequency_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_frequency_check 
CHECK (frequency IN ('one-time', 'biweekly', 'monthly', 'quarterly', 'yearly'));
