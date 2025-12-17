-- Add biweekly frequency option to subscriptions table
-- This updates the CHECK constraint to allow 'biweekly' as a valid frequency value

-- Drop the existing constraint
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_frequency_check;

-- Add the new constraint with biweekly included
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_frequency_check 
CHECK (frequency IN ('one-time', 'biweekly', 'monthly', 'yearly'));
