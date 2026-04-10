-- PIXY FLOWS MVP SCHEMA
-- Implements the "Virtual Employee" data model (Narrative, Outcome-first)

-- 1. FLOW TEMPLATES (The "promised results" gallery)
-- Static definition of the 5 Master Routines. Not user editable.
CREATE TABLE IF NOT EXISTS public.flow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- e.g., 'payment_recovery', 'review_request'
  name TEXT NOT NULL, -- e.g., 'Cobrador Amable'
  description TEXT NOT NULL, -- Narrative description of the outcome
  icon TEXT NOT NULL, -- Lucide icon name
  category TEXT NOT NULL, -- 'sales', 'retention', 'operations'
  definition_json JSONB NOT NULL, -- The base structure of steps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FLOW ROUTINES (Active instances)
-- The "hired employees" for a specific organization and space.
CREATE TABLE IF NOT EXISTS public.flow_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL, -- Context is mandatory (no generic flows)
  template_id UUID NOT NULL REFERENCES public.flow_templates(id),
  
  name TEXT NOT NULL, -- User-friendly name (e.g., "Cobranza Clientes VIP")
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'archived', 'error')), -- Explicit status
  
  configuration_json JSONB DEFAULT '{}'::jsonb, -- User overrides (Mad Libs inputs)
  
  current_version INT NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ
);

-- 3. FLOW ROUTINE VERSIONS (Fire Insurance)
-- Immutable snapshots of a routine's state at a point in time.
CREATE TABLE IF NOT EXISTS public.flow_routine_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.flow_routines(id) ON DELETE CASCADE,
  version INT NOT NULL,
  
  snapshot_json JSONB NOT NULL, -- Complete dump of steps and config
  created_by TEXT DEFAULT 'system', -- 'system' or 'user_id'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(routine_id, version)
);

-- 4. FLOW STEPS (The "Training")
-- Sequential steps for a routine. In v1, strict order, no branching complex logic.
CREATE TABLE IF NOT EXISTS public.flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.flow_routines(id) ON DELETE CASCADE,
  
  position INT NOT NULL, -- 1-indexed execution order
  type TEXT NOT NULL CHECK (type IN ('trigger', 'action', 'wait', 'rule')),
  
  key TEXT NOT NULL, -- Internal identifier (e.g., 'send_whatsapp')
  config_json JSONB DEFAULT '{}'::jsonb, -- Step-specific parameters
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FLOW EXECUTIONS ( The "Logbook")
-- Narrative log of what happened. Not technical debug logs.
CREATE TABLE IF NOT EXISTS public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.flow_routines(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  outcome TEXT, -- Narrative summary (e.g., "Enviados 3 recordatorios, 1 respondido")
  
  logs_json JSONB DEFAULT '[]'::jsonb, -- Array of narrative steps: [{ "time": "...", "message": "Esperé 3 días" }]
  
  error_details JSONB -- Only populated on failure, kept internal
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_routines_org ON public.flow_routines(organization_id);
CREATE INDEX IF NOT EXISTS idx_flow_routines_space ON public.flow_routines(space_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_routine ON public.flow_executions(routine_id);

-- RLS Policies (Draft - to be enabled)
ALTER TABLE public.flow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_routine_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
