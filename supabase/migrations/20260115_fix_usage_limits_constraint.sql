-- Fix Usage Limits Constraint
-- The 'plan_limits_system' tries to insert 'unlimited' period, but the table has a check constraint for only 'day' and 'month'.

ALTER TABLE public.usage_limits DROP CONSTRAINT IF EXISTS usage_limits_period_check;

ALTER TABLE public.usage_limits 
    ADD CONSTRAINT usage_limits_period_check 
    CHECK (period IN ('day', 'month', 'year', 'unlimited'));
