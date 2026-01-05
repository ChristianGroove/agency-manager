-- Phase 6: Intelligence, Control & Auto-Expansion

-- 1. Observability: Materialized View for Daily Stats
-- Aggregates usage events for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.analytics_daily_usage AS
SELECT
    organization_id,
    engine,
    action,
    date_trunc('day', occurred_at)::date as usage_date,
    SUM(quantity) as units_consumed,
    COUNT(*) as event_count
FROM
    public.usage_events
GROUP BY
    organization_id,
    engine,
    action,
    date_trunc('day', occurred_at);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_analytics_daily_usage_org_date 
ON public.analytics_daily_usage (organization_id, usage_date);

-- 2. Auto-Upsell / Alerts: Usage Alerts View
-- Identifies organizations close to their limits
CREATE OR REPLACE VIEW public.system_usage_alerts AS
SELECT
    l.organization_id,
    org.name as organization_name,
    org.parent_organization_id,
    l.engine,
    l.period,
    l.limit_value,
    COALESCE(c.used, 0) as used_value,
    ROUND((COALESCE(c.used, 0)::numeric / l.limit_value::numeric) * 100, 2) as usage_percentage,
    CASE
        WHEN COALESCE(c.used, 0) >= l.limit_value THEN 'critical_overage'
        WHEN COALESCE(c.used, 0) >= (l.limit_value * 0.9) THEN 'critical_warning'
        WHEN COALESCE(c.used, 0) >= (l.limit_value * 0.8) THEN 'warning'
        ELSE 'normal'
    END as alert_level
FROM
    public.usage_limits l
JOIN
    public.organizations org ON l.organization_id = org.id
LEFT JOIN
    public.usage_counters c ON 
        c.organization_id = l.organization_id 
        AND c.engine = l.engine 
        AND c.period = l.period
        -- Dynamically match current period start
        AND c.period_start = CASE 
            WHEN l.period = 'day' THEN current_date
            WHEN l.period = 'month' THEN date_trunc('month', current_date)::date
        END
WHERE
    COALESCE(c.used, 0) >= (l.limit_value * 0.8); -- Only show alerts > 80%

-- 3. Health Score View
-- Simple heuristic: Payment Status + Usage Health
CREATE OR REPLACE VIEW public.organization_health_scores AS
SELECT
    o.id as organization_id,
    o.name,
    o.status,
    o.payment_status,
    -- Simple Score Logic
    (
        100 
        - (CASE WHEN o.payment_status != 'good_standing' THEN 50 ELSE 0 END)
        - (CASE WHEN o.status = 'suspended' THEN 100 ELSE 0 END)
        - (CASE WHEN o.status = 'limited' THEN 30 ELSE 0 END)
    ) as health_score
FROM
    public.organizations o;

-- 4. Refresh Job Pattern (Conceptual)
-- In Supabase, you'd use pg_cron to refresh the materialized view
-- SELECT cron.schedule('0 0 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.analytics_daily_usage');
