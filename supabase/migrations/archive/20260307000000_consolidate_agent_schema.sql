-- Phase 2: Database Normalization
-- Mission: Consolidate agent_availability and agent_skills, fixing duplication and establishing a single source of truth.

BEGIN;

-- 1. Create a backup of existing data if tables exist (Safety First)
-- Note: We use anonymous blocks to handle conditional existence gracefully
DO $$ 
BEGIN
    -- Check if agent_availability exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_availability') THEN
        CREATE TABLE IF NOT EXISTS public.agent_availability_backup_before_sync AS SELECT * FROM public.agent_availability;
    END IF;
    
    -- Check if agent_skills exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_skills') THEN
        CREATE TABLE IF NOT EXISTS public.agent_skills_backup_before_sync AS SELECT * FROM public.agent_skills;
    END IF;
END $$;

-- 2. Consolidate agent_availability
-- We will follow the structure from the latest intended design but ensuring it's idempotent.
-- Based on the audit, we had two definitions. We'll stick to:
-- PRIMARY KEY (agent_id) is better for 1:1 user-agent mapping, but some systems might allow multiple orgs.
-- However, our system uses organization_id in the table. So (organization_id, agent_id) should be the unique key.

CREATE TABLE IF NOT EXISTS public.agent_availability_new (
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline', 'busy')),
    max_capacity INTEGER DEFAULT 5,
    current_load INTEGER DEFAULT 0,
    auto_assign_enabled BOOLEAN DEFAULT false,
    timezone TEXT DEFAULT 'America/Bogota',
    work_schedule JSONB DEFAULT '{}'::jsonb,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    PRIMARY KEY (organization_id, agent_id)
);

-- Migrating data from existing table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_availability') THEN
        INSERT INTO public.agent_availability_new (
            agent_id, organization_id, status, max_capacity, current_load, 
            auto_assign_enabled, timezone, last_seen_at, created_at, updated_at
        )
        SELECT 
            agent_id, 
            organization_id, 
            COALESCE(status, 'offline'), 
            COALESCE(max_capacity, 5), 
            COALESCE(current_load, 0), 
            COALESCE(auto_assign_enabled, false),
            'America/Bogota', -- Default if missing
            COALESCE(last_seen_at, now()),
            COALESCE(created_at, now()),
            COALESCE(updated_at, now())
        FROM public.agent_availability
        ON CONFLICT (organization_id, agent_id) DO UPDATE SET
            status = EXCLUDED.status,
            max_capacity = EXCLUDED.max_capacity,
            current_load = EXCLUDED.current_load,
            auto_assign_enabled = EXCLUDED.auto_assign_enabled,
            updated_at = now();
            
        -- Drop old table (we have a backup)
        DROP TABLE public.agent_availability CASCADE;
    END IF;
END $$;

-- Rename new table to definitive name
ALTER TABLE public.agent_availability_new RENAME TO agent_availability;

-- 3. Consolidate agent_skills
CREATE TABLE IF NOT EXISTS public.agent_skills_new (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    proficiency INTEGER DEFAULT 3 CHECK (proficiency BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    PRIMARY KEY (organization_id, agent_id, skill)
);

-- Handle data migration for skills
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_skills') THEN
        INSERT INTO public.agent_skills_new (organization_id, agent_id, skill, proficiency, created_at)
        SELECT 
            organization_id, 
            agent_id, 
            skill, 
            COALESCE(proficiency, 3),
            COALESCE(created_at, now())
        FROM public.agent_skills
        ON CONFLICT (organization_id, agent_id, skill) DO NOTHING;
        
        DROP TABLE public.agent_skills CASCADE;
    END IF;
END $$;

ALTER TABLE public.agent_skills_new RENAME TO agent_skills;

-- 4. Create Channel-Agent Mapping (NEW STRUCTURE for Phase 2)
-- This allows explicit control over which agents can handle which channels
CREATE TABLE IF NOT EXISTS public.agent_channels (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL, -- 'whatsapp', 'messenger', 'instagram', 'email', 'sms', 'evolution'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    PRIMARY KEY (organization_id, agent_id, channel_type),
    CONSTRAINT agent_channels_agent_fkey FOREIGN KEY (organization_id, agent_id) 
        REFERENCES public.agent_availability(organization_id, agent_id) ON DELETE CASCADE
);

-- 5. Re-enable RLS and Policies correctly
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_channels ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy: Users can only see/manage data from their own organization
CREATE POLICY "Agent Availability Organization Isolation" ON public.agent_availability
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Agent Skills Organization Isolation" ON public.agent_skills
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Agent Channels Organization Isolation" ON public.agent_channels
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_agent_availability_status ON public.agent_availability(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_skills_lookup ON public.agent_skills(organization_id, skill);
CREATE INDEX IF NOT EXISTS idx_agent_channels_lookup ON public.agent_channels(organization_id, channel_type);

COMMIT;
