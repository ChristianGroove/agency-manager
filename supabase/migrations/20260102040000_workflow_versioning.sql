-- Create workflow_versions table
CREATE TABLE IF NOT EXISTS public.workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    name TEXT,
    is_published BOOLEAN DEFAULT FALSE
);

-- Index for faster history lookups
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON public.workflow_versions(workflow_id);

-- RLS Policies
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;

-- Allow read access to organization members
CREATE POLICY "Users can view versions of their organization's workflows"
    ON public.workflow_versions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workflows w
            WHERE w.id = workflow_versions.workflow_id
            AND w.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow create access to organization members (editors)
CREATE POLICY "Users can create versions for their organization's workflows"
    ON public.workflow_versions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workflows w
            WHERE w.id = workflow_versions.workflow_id
            AND w.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );
