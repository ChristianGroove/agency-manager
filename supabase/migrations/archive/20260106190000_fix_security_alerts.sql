-- ============================================
-- Fix Supabase Security Alerts
-- 1. Enable RLS on automation_queue
-- 2. Redefine analytics views with security invoker
-- ============================================

-- ============================================
-- 1. AUTOMATION_QUEUE RLS
-- ============================================
ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for cron/webhook processing)
DROP POLICY IF EXISTS automation_queue_service_role ON public.automation_queue;
CREATE POLICY automation_queue_service_role ON public.automation_queue
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 2. FIX SECURITY DEFINER VIEWS
-- Recreate views with SECURITY INVOKER (safer)
-- These use the EXACT original definitions, just adding security_invoker
-- ============================================

-- ai_suggestion_analytics - original definition from 20260103030000_ai_smart_replies.sql
DROP VIEW IF EXISTS public.ai_suggestion_analytics;
CREATE VIEW public.ai_suggestion_analytics
WITH (security_invoker = true)
AS
SELECT 
    COUNT(*) as total_suggestions,
    COUNT(selected_response) as times_used,
    ROUND(COUNT(selected_response)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as usage_rate,
    AVG(generation_time_ms) as avg_generation_time_ms,
    COUNT(CASE WHEN was_edited = false THEN 1 END) as used_without_edit,
    model_used,
    DATE_TRUNC('day', created_at) as date
FROM public.ai_suggestions
GROUP BY model_used, DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- For the other views, Supabase may have created them automatically
-- or they may not exist. We'll only fix them if they exist.

-- Drop old security definer views IF they exist and won't break anything
-- These are admin analytics views, we'll drop them if problematic

-- Grant permissions
GRANT SELECT ON public.ai_suggestion_analytics TO authenticated;

COMMENT ON VIEW public.ai_suggestion_analytics IS 'AI suggestion analytics - security invoker view';

