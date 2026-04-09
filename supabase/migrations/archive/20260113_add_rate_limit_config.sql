-- Add rate limit configuration to organizations
-- This allows per-organization rate limiting beyond the default IP-based limits

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS rate_limit_config JSONB DEFAULT '{"requests_per_minute": 500, "ai_requests_per_day": 100}';

COMMENT ON COLUMN public.organizations.rate_limit_config IS 'Per-organization rate limit configuration. Keys: requests_per_minute, ai_requests_per_day';

-- Create index for faster lookups during rate limit checks
CREATE INDEX IF NOT EXISTS idx_organizations_rate_limit ON public.organizations USING GIN (rate_limit_config);
