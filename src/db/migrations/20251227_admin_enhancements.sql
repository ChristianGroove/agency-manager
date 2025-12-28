-- Migration: Add System Alerts and Manual Module Overrides
-- Description: Supports Admin Broadcasts and granular Feature Flags
-- Date: 2025-12-27

-- 1. System Alerts Table
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    message text NOT NULL,
    severity text CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    target_audience text CHECK (target_audience IN ('all', 'admins_only')) DEFAULT 'all',
    is_active boolean DEFAULT true,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- 2. RLS for System Alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active alerts
CREATE POLICY "Everyone can read active alerts" ON public.system_alerts
    FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Super Admins can manage alerts
CREATE POLICY "Super Admins can manage alerts" ON public.system_alerts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

-- 3. Manual Module Overrides for Organizations
-- Stores array of module keys to FORCE ENABLE, bypassing subscription logic.
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS manual_module_overrides jsonb DEFAULT '[]'::jsonb;

-- 4. Index for alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_active ON public.system_alerts(is_active, expires_at);
