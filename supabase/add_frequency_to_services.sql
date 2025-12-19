-- Add frequency column to services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS frequency text CHECK (frequency IN ('monthly', 'quarterly', 'yearly', 'biweekly', 'one-time'));

-- Update existing migrated services based on description logic or default
-- (My previous migration put frequency in description: 'Migrated Subscription: ... (monthly)')
-- I can try to extract it or just set default 'monthly' for recurring ones.

UPDATE public.services
SET frequency = 'monthly'
WHERE type = 'recurring' AND frequency IS NULL;

UPDATE public.services
SET frequency = 'one-time'
WHERE type = 'one_off' AND frequency IS NULL;
