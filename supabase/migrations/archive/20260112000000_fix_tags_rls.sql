-- Fix RLS Policies for crm_tags to avoid accessing auth.users directly
-- Original policies caused "permission denied for table users"

-- 1. Policies for crm_tags
DROP POLICY IF EXISTS "Users can view tags from their organization" ON crm_tags;
CREATE POLICY "Users can view tags from their organization"
    ON crm_tags FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert tags for their organization" ON crm_tags;
CREATE POLICY "Users can insert tags for their organization"
    ON crm_tags FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update tags from their organization" ON crm_tags;
CREATE POLICY "Users can update tags from their organization"
    ON crm_tags FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete tags from their organization" ON crm_tags;
CREATE POLICY "Users can delete tags from their organization"
    ON crm_tags FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- 2. Policies for crm_lead_tags
DROP POLICY IF EXISTS "Users can view lead tags via tag organization" ON crm_lead_tags;
CREATE POLICY "Users can view lead tags via tag organization"
    ON crm_lead_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm_tags 
            WHERE crm_tags.id = crm_lead_tags.tag_id 
            AND crm_tags.organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert lead tags" ON crm_lead_tags;
CREATE POLICY "Users can insert lead tags"
    ON crm_lead_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_tags 
            WHERE crm_tags.id = crm_lead_tags.tag_id 
            AND crm_tags.organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete lead tags" ON crm_lead_tags;
CREATE POLICY "Users can delete lead tags"
    ON crm_lead_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM crm_tags 
            WHERE crm_tags.id = crm_lead_tags.tag_id 
            AND crm_tags.organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );
