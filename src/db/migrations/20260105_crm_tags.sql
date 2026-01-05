-- Create crm_tags table
CREATE TABLE IF NOT EXISTS crm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#808080',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Create crm_lead_tags junction table
CREATE TABLE IF NOT EXISTS crm_lead_tags (
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (lead_id, tag_id)
);

-- Enable RLS
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_tags
CREATE POLICY "Users can view tags from their organization"
    ON crm_tags FOR SELECT
    USING (organization_id = (SELECT organization_id FROM auth.users WHERE auth.users.id = auth.uid()));

CREATE POLICY "Users can insert tags for their organization"
    ON crm_tags FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM auth.users WHERE auth.users.id = auth.uid()));

CREATE POLICY "Users can update tags from their organization"
    ON crm_tags FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM auth.users WHERE auth.users.id = auth.uid()));

CREATE POLICY "Users can delete tags from their organization"
    ON crm_tags FOR DELETE
    USING (organization_id = (SELECT organization_id FROM auth.users WHERE auth.users.id = auth.uid()));

-- RLS Policies for crm_lead_tags
-- Check if the user has access to the tag's organization
CREATE POLICY "Users can view lead tags via tag organization"
    ON crm_lead_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm_tags 
            WHERE crm_tags.id = crm_lead_tags.tag_id 
            AND crm_tags.organization_id = (SELECT organization_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "Users can insert lead tags"
    ON crm_lead_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_tags 
            WHERE crm_tags.id = crm_lead_tags.tag_id 
            AND crm_tags.organization_id = (SELECT organization_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "Users can delete lead tags"
    ON crm_lead_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM crm_tags 
            WHERE crm_tags.id = crm_lead_tags.tag_id 
            AND crm_tags.organization_id = (SELECT organization_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

-- Add distinct index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crm_tags_org ON crm_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_tags_lead ON crm_lead_tags(lead_id);
