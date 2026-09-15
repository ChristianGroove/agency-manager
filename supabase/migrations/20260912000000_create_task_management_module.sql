-- Migration: 20260912000000_create_task_management_module.sql
-- Description: Create task projects, task items, task comments, and project members tables for collaborative task management module (Jira-like)

-- 1. Create task_projects table
CREATE TABLE IF NOT EXISTS public.task_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'FolderKanban',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    lead_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    start_date DATE,
    target_date DATE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_task_projects_org_slug UNIQUE(organization_id, slug)
);

-- 2. Create task_items table
CREATE TABLE IF NOT EXISTS public.task_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.task_projects(id) ON DELETE CASCADE,
    ticket_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    type TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('task', 'feature', 'bug', 'improvement', 'delivery')),
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    assigned_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    created_by_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    qa_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    due_date DATE,
    estimated_hours NUMERIC(6,2) DEFAULT 0,
    actual_hours NUMERIC(6,2) DEFAULT 0,
    checklist JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    attachments JSONB DEFAULT '[]'::jsonb,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.task_items(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL DEFAULT 'staff' CHECK (author_type IN ('staff', 'owner', 'system')),
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    content TEXT NOT NULL,
    mentions TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create task_project_members table
CREATE TABLE IF NOT EXISTS public.task_project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.task_projects(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('pm', 'qa_lead', 'developer', 'designer', 'specialist', 'observer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_task_project_members UNIQUE(project_id, staff_id)
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_task_projects_org ON public.task_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_projects_status ON public.task_projects(status);
CREATE INDEX IF NOT EXISTS idx_task_items_org ON public.task_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_items_proj ON public.task_items(project_id);
CREATE INDEX IF NOT EXISTS idx_task_items_status ON public.task_items(status);
CREATE INDEX IF NOT EXISTS idx_task_items_assigned ON public.task_items(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_task_items_qa ON public.task_items(qa_staff_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_project_members_proj ON public.task_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_task_project_members_staff ON public.task_project_members(staff_id);

-- Enable RLS
ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_project_members ENABLE ROW LEVEL SECURITY;

-- Permissive policies for tenant access & service role
DROP POLICY IF EXISTS "tenant_manage_task_projects" ON public.task_projects;
CREATE POLICY "tenant_manage_task_projects" ON public.task_projects
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_manage_task_items" ON public.task_items;
CREATE POLICY "tenant_manage_task_items" ON public.task_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_manage_task_comments" ON public.task_comments;
CREATE POLICY "tenant_manage_task_comments" ON public.task_comments
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_manage_task_project_members" ON public.task_project_members;
CREATE POLICY "tenant_manage_task_project_members" ON public.task_project_members
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Register module in system_modules
INSERT INTO public.system_modules (key, name, description, category, is_active, version, icon)
VALUES (
    'module_tasks',
    'Gestión de Tareas y Proyectos',
    'Panel colaborativo ágil tipo Jira con portales de trabajo por rol para desarrolladores, diseñadores y QA',
    'operations',
    true,
    '1.0.0',
    'Kanban'
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    icon = EXCLUDED.icon;

-- Register in saas_app_modules for app_saas_platform (SaaS Space)
INSERT INTO public.saas_app_modules (app_id, module_key, auto_enable, is_core, is_optional, sort_order)
VALUES (
    'app_saas_platform',
    'module_tasks',
    true,
    true,
    false,
    6
)
ON CONFLICT (app_id, module_key) DO UPDATE SET
    auto_enable = true,
    is_core = true;
