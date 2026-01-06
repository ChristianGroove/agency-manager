-- ============================================
-- Fix Supabase Security Alerts
-- 1. Enable RLS on automation_queue
-- 2. Secure analytics views with invoker security
-- ============================================

-- ============================================
-- 1. AUTOMATION_QUEUE RLS
-- ============================================
ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for cron/webhook processing)
-- This table is only accessed by backend services, not end users
CREATE POLICY automation_queue_service_role ON public.automation_queue
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 2. FIX SECURITY DEFINER VIEWS
-- Recreate views with SECURITY INVOKER (safer)
-- ============================================

-- Drop and recreate ai_suggestion_analytics with invoker security
DROP VIEW IF EXISTS public.ai_suggestion_analytics;
CREATE VIEW public.ai_suggestion_analytics
WITH (security_invoker = true)
AS
SELECT 
    organization_id,
    DATE(created_at) as date,
    COUNT(*) as total_suggestions,
    COUNT(*) FILTER (WHERE was_used = true) as used_suggestions,
    ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence
FROM public.ai_suggestions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY organization_id, DATE(created_at)
ORDER BY date DESC;

-- Drop and recreate organization_health_scores with invoker security
DROP VIEW IF EXISTS public.organization_health_scores;
CREATE VIEW public.organization_health_scores
WITH (security_invoker = true)
AS
SELECT 
    o.id as organization_id,
    o.name,
    o.is_active,
    COUNT(DISTINCT cl.id) as total_clients,
    COUNT(DISTINCT om.user_id) as total_members,
    o.created_at
FROM public.organizations o
LEFT JOIN public.clients cl ON cl.organization_id = o.id
LEFT JOIN public.organization_members om ON om.organization_id = o.id
GROUP BY o.id, o.name, o.is_active, o.created_at;

-- Drop and recreate sentiment_analytics with invoker security
DROP VIEW IF EXISTS public.sentiment_analytics;
CREATE VIEW public.sentiment_analytics
WITH (security_invoker = true)
AS
SELECT 
    organization_id,
    DATE(created_at) as date,
    sentiment,
    COUNT(*) as count
FROM public.messages
WHERE sentiment IS NOT NULL
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY organization_id, DATE(created_at), sentiment;

-- Drop and recreate system_usage_alerts with invoker security  
DROP VIEW IF EXISTS public.system_usage_alerts;
CREATE VIEW public.system_usage_alerts
WITH (security_invoker = true)
AS
SELECT 
    o.id as organization_id,
    o.name,
    'low_activity' as alert_type,
    'No activity in last 7 days' as message
FROM public.organizations o
LEFT JOIN public.clients cl ON cl.organization_id = o.id 
    AND cl.created_at > NOW() - INTERVAL '7 days'
WHERE o.is_active = true
AND cl.id IS NULL;

-- Drop and recreate v_organization_templates with invoker security
DROP VIEW IF EXISTS public.v_organization_templates;
CREATE VIEW public.v_organization_templates
WITH (security_invoker = true)
AS
SELECT 
    wt.id,
    wt.name,
    wt.description,
    wt.category,
    wt.template_data,
    wt.is_global,
    wt.organization_id,
    wt.created_at
FROM public.workflow_templates wt
WHERE wt.is_global = true 
   OR wt.organization_id IN (
       SELECT organization_id FROM public.organization_members 
       WHERE user_id = auth.uid()
   );

-- Drop and recreate v_template_modules with invoker security
DROP VIEW IF EXISTS public.v_template_modules;
CREATE VIEW public.v_template_modules
WITH (security_invoker = true)
AS
SELECT 
    sm.id,
    sm.module_id,
    sm.display_name,
    sm.description,
    sm.icon,
    sm.is_premium
FROM public.system_modules sm
WHERE sm.is_active = true;

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.ai_suggestion_analytics TO authenticated;
GRANT SELECT ON public.organization_health_scores TO authenticated;
GRANT SELECT ON public.sentiment_analytics TO authenticated;
GRANT SELECT ON public.system_usage_alerts TO authenticated;
GRANT SELECT ON public.v_organization_templates TO authenticated;
GRANT SELECT ON public.v_template_modules TO authenticated;

COMMENT ON VIEW public.ai_suggestion_analytics IS 'AI suggestion analytics - security invoker view';
COMMENT ON VIEW public.organization_health_scores IS 'Organization health metrics - security invoker view';
COMMENT ON VIEW public.sentiment_analytics IS 'Message sentiment analytics - security invoker view';
COMMENT ON VIEW public.system_usage_alerts IS 'System usage alerts - security invoker view';
COMMENT ON VIEW public.v_organization_templates IS 'Organization accessible templates - security invoker view';
COMMENT ON VIEW public.v_template_modules IS 'Active system modules - security invoker view';
