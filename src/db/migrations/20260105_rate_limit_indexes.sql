-- Phase 6: Performance Indexes for Rate Limiting

-- Metric: "Requests per minute per engine"
-- Query: count(*) from usage_events where org_id = ? and engine = ? and occurred_at > now() - '1 min'
CREATE INDEX IF NOT EXISTS idx_usage_org_engine_time 
ON public.usage_events (organization_id, engine, occurred_at DESC);
