-- Phase 6: Rate Limiting Support

-- Update check constraints to allow 'hour' and 'minute'
ALTER TABLE public.usage_limits 
DROP CONSTRAINT usage_limits_period_check;

ALTER TABLE public.usage_limits
ADD CONSTRAINT usage_limits_period_check 
CHECK (period IN ('day', 'month', 'hour', 'minute'));

ALTER TABLE public.usage_counters
DROP CONSTRAINT usage_counters_period_check;

ALTER TABLE public.usage_counters
ADD CONSTRAINT usage_counters_period_check
CHECK (period IN ('day', 'month', 'hour', 'minute'));

-- Note: In logic, updating usage_counters for 'minute' requires the 'period_start' to track minutes
-- date_trunc('minute', now())
