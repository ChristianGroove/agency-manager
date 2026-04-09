-- Migration: CRM Reporting System Init
-- Description: Register module, history tables, and monitoring triggers.
-- Date: 2026-03-27

BEGIN;

-- 1. Register Module in System Modules
-- This allows manual assignment via SaaS Engine
INSERT INTO public.system_modules (key, name, description, category, compatible_verticals, icon, color, is_premium, display_order)
VALUES (
    'module_crm_reports', 
    'CRM Insights & Monitoring', 
    'Monitoreo avanzado de agentes, tiempos de respuesta, abandono de leads y analítica granular de conversión.',
    'premium',
    ARRAY['*'],
    'BarChart3',
    '#3b82f6',
    true,
    50
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon;

-- 2. Create Agent Status History table
-- Purely additive to capture connection metrics over time
CREATE TABLE IF NOT EXISTS public.agent_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'online', 'away', 'offline', 'busy'
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agent_status_history_agent_date ON public.agent_status_history(agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_status_history_org ON public.agent_status_history(organization_id);

-- 3. Trigger Function to log status changes
CREATE OR REPLACE FUNCTION public.log_agent_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if status actually changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
        
        -- Close previous open session for this agent/org
        UPDATE public.agent_status_history
        SET 
            ended_at = now(),
            duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER
        WHERE agent_id = NEW.agent_id 
          AND organization_id = NEW.organization_id 
          AND ended_at IS NULL;
          
        -- Create new session entry
        INSERT INTO public.agent_status_history (organization_id, agent_id, status, started_at)
        VALUES (NEW.organization_id, NEW.agent_id, NEW.status, now());
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Install Trigger on agent_availability
DROP TRIGGER IF EXISTS tr_log_agent_status_change ON public.agent_availability;
CREATE TRIGGER tr_log_agent_status_change
    BEFORE INSERT OR UPDATE ON public.agent_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.log_agent_status_change();

-- 5. Backfill: Create initial entries for currently online agents
INSERT INTO public.agent_status_history (organization_id, agent_id, status, started_at)
SELECT organization_id, agent_id, status, COALESCE(last_seen_at, now())
FROM public.agent_availability
WHERE status != 'offline'
ON CONFLICT DO NOTHING;

COMMIT;
