-- FIX: Create missing organization_modules table
-- This table is used for manual/legacy module assignments independent of SaaS subscriptions.

CREATE TABLE IF NOT EXISTS organization_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, module_key)
);

-- Enable RLS
ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;

-- Basic Policy (Read-only for users in the org)
CREATE POLICY "Org Members View Modules" ON organization_modules
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- After creating the table, we can insert the module
DO $$
DECLARE
    target_org_id UUID;
BEGIN
    -- Intentar buscar por slug 'cleanity2' (que es el verificado en la imagen del usuario)
    SELECT id INTO target_org_id FROM organizations WHERE slug = 'cleanity2';

    IF target_org_id IS NOT NULL THEN
        INSERT INTO organization_modules (organization_id, module_key)
        VALUES (target_org_id, 'module_cleaning')
        ON CONFLICT (organization_id, module_key) DO NOTHING;
        
        RAISE NOTICE 'Módulo cleaning activado para la org: %', target_org_id;
    ELSE
        RAISE NOTICE 'No se encontró la organización con slug cleanity2.';
    END IF;
END $$;
