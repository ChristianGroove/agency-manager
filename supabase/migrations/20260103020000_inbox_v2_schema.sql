-- Inbox V2: Enhanced Schema for Production-Grade Messaging

-- Add conversation management fields
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'active' 
    CHECK (state IN ('active', 'archived', 'spam', 'deleted')),
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_profile JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_state ON public.conversations(state);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON public.conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON public.conversations USING gin(tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_conversations_search ON public.conversations 
  USING gin(to_tsvector('english', coalesce(last_message, '')));

-- Message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reaction TEXT NOT NULL, -- emoji
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for reactions (idempotent)
DROP POLICY IF EXISTS "Users can view reactions" ON public.message_reactions;
CREATE POLICY "Users can view reactions"
    ON public.message_reactions FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
    ON public.message_reactions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove own reactions" ON public.message_reactions;
CREATE POLICY "Users can remove own reactions"
    ON public.message_reactions FOR DELETE
    USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Quick replies / Saved templates table
CREATE TABLE IF NOT EXISTS public.quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    shortcut TEXT, -- e.g., /hello
    category TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_org ON public.quick_replies(organization_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_shortcut ON public.quick_replies(shortcut);

-- Enable RLS
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DROP POLICY IF EXISTS "Users can view org quick replies" ON public.quick_replies;
CREATE POLICY "Users can view org quick replies"
    ON public.quick_replies FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create quick replies" ON public.quick_replies;
CREATE POLICY "Users can create quick replies"
    ON public.quick_replies FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update quick replies" ON public.quick_replies;
CREATE POLICY "Users can update quick replies"
    ON public.quick_replies FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Agent presence tracking
CREATE TABLE IF NOT EXISTS public.agent_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
    last_seen TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DROP POLICY IF EXISTS "Users can view presence" ON public.agent_presence;
CREATE POLICY "Users can view presence"
    ON public.agent_presence FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own presence" ON public.agent_presence;
CREATE POLICY "Users can update own presence"
    ON public.agent_presence FOR UPDATE
    USING (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own presence" ON public.agent_presence;
CREATE POLICY "Users can insert own presence"
    ON public.agent_presence FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Enable Realtime for new tables (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'message_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'agent_presence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_presence;
    END IF;
END $$;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_quick_replies_updated_at ON public.quick_replies;
CREATE TRIGGER update_quick_replies_updated_at BEFORE UPDATE ON public.quick_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_presence_updated_at ON public.agent_presence;
CREATE TRIGGER update_agent_presence_updated_at BEFORE UPDATE ON public.agent_presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INTELLIGENT ASSIGNMENT SYSTEM
-- ==========================================

-- Assignment rules configuration
CREATE TABLE IF NOT EXISTS public.assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    strategy TEXT NOT NULL CHECK (strategy IN ('round-robin', 'load-balance', 'skills-based', 'specific-agent')),
    assign_to UUID[], -- array of agent IDs for pool-based strategies
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_org ON public.assignment_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_priority ON public.assignment_rules(priority ASC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active ON public.assignment_rules(is_active);

-- Agent availability and capacity management
CREATE TABLE IF NOT EXISTS public.agent_availability (
    agent_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline', 'busy')),
    max_capacity INTEGER DEFAULT 20,
    current_load INTEGER DEFAULT 0,
    auto_assign_enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    work_schedule JSONB DEFAULT '{}'::jsonb,
    last_seen TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_availability_status ON public.agent_availability(status) WHERE auto_assign_enabled = true;

-- Agent skills for skills-based routing
CREATE TABLE IF NOT EXISTS public.agent_skills (
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    proficiency INTEGER DEFAULT 3 CHECK (proficiency BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (agent_id, skill)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_skill ON public.agent_skills(skill);
CREATE INDEX IF NOT EXISTS idx_agent_skills_proficiency ON public.agent_skills(proficiency DESC);

-- Assignment history for analytics and auditing
CREATE TABLE IF NOT EXISTS public.assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assignment_method TEXT CHECK (assignment_method IN ('manual', 'auto-rule', 'load-balance', 'skills-match', 'round-robin')),
    rule_id UUID REFERENCES public.assignment_rules(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_conv ON public.assignment_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_agent ON public.assignment_history(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignment_history_created ON public.assignment_history(created_at DESC);

-- RLS Policies for assignment tables
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;

-- Assignment Rules Policies (idempotent)
DROP POLICY IF EXISTS "Users can view assignment rules" ON public.assignment_rules;
CREATE POLICY "Users can view assignment rules"
    ON public.assignment_rules FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage assignment rules" ON public.assignment_rules;
CREATE POLICY "Admins can manage assignment rules"
    ON public.assignment_rules FOR ALL
    USING (auth.role() = 'authenticated');

-- Agent Availability Policies (idempotent)
DROP POLICY IF EXISTS "Users can view agent availability" ON public.agent_availability;
CREATE POLICY "Users can view agent availability"
    ON public.agent_availability FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own availability" ON public.agent_availability;
CREATE POLICY "Users can update own availability"
    ON public.agent_availability FOR UPDATE
    USING (auth.role() = 'authenticated' AND agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own availability" ON public.agent_availability;
CREATE POLICY "Users can insert own availability"
    ON public.agent_availability FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND agent_id = auth.uid());

-- Agent Skills Policies (idempotent)
DROP POLICY IF EXISTS "Users can view agent skills" ON public.agent_skills;
CREATE POLICY "Users can view agent skills"
    ON public.agent_skills FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage own skills" ON public.agent_skills;
CREATE POLICY "Users can manage own skills"
    ON public.agent_skills FOR ALL
    USING (auth.role() = 'authenticated' AND agent_id = auth.uid());

-- Assignment History Policies (idempotent)
DROP POLICY IF EXISTS "Users can view assignment history" ON public.assignment_history;
CREATE POLICY "Users can view assignment history"
    ON public.assignment_history FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "System can insert assignment history" ON public.assignment_history;
CREATE POLICY "System can insert assignment history"
    ON public.assignment_history FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Triggers (idempotent)
DROP TRIGGER IF EXISTS update_assignment_rules_updated_at ON public.assignment_rules;
CREATE TRIGGER update_assignment_rules_updated_at BEFORE UPDATE ON public.assignment_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_availability_updated_at ON public.agent_availability;
CREATE TRIGGER update_agent_availability_updated_at BEFORE UPDATE ON public.agent_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'agent_availability'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_availability;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'assignment_history'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_history;
    END IF;
END $$;

