-- ============================================
-- CRM ENTITY CONSOLIDATION — STEP 1: EXTEND LEADS (ADDITIVE ONLY)
-- Date: 2026-04-01
-- Description: Add billing/portal/identity columns to leads table
--              to support unified contact entity.
--              SAFE: Only ADD COLUMN IF NOT EXISTS. No drops, no deletes.
-- Rollback: These columns can be ignored if migration is reverted.
-- ============================================

-- ============================================
-- 1. CONTACT TYPE DISCRIMINATOR
-- This field determines WHERE a record appears in the UI
-- ============================================
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'lead' 
    CHECK (contact_type IN ('lead', 'prospect', 'client', 'partner'));

COMMENT ON COLUMN public.leads.contact_type IS 
    'Discriminator for UI routing: lead=CRM pipeline, client=billing section, prospect=pre-qualified, partner=vendor/supplier';

-- ============================================
-- 2. BILLING IDENTITY FIELDS (from clients)
-- ============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nit TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.leads.nit IS 'Fiscal ID (NIT/RUT). Populated when contact_type = client.';
COMMENT ON COLUMN public.leads.address IS 'Physical address. Populated when contact_type = client.';

-- ============================================
-- 3. PORTAL ACCESS FIELDS (from clients)
-- ============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS portal_token UUID;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS portal_short_token TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS portal_token_created_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS portal_token_never_expires BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS portal_config JSONB DEFAULT '{}';

COMMENT ON COLUMN public.leads.portal_token IS 'UUID token for client portal access.';
COMMENT ON COLUMN public.leads.portal_short_token IS 'Short human-readable token for portal access.';

-- ============================================
-- 4. SOCIAL MEDIA FIELDS (from clients)
-- ============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS linkedin TEXT DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS youtube TEXT DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS twitter TEXT DEFAULT '';

-- ============================================
-- 5. SOFT DELETE (from clients)  
-- ============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.leads.deleted_at IS 'Soft delete timestamp. Records with non-null deleted_at are hidden from queries.';

-- ============================================
-- 6. MIGRATION TRACKING
-- ============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS migrated_from_client_id UUID;

COMMENT ON COLUMN public.leads.migrated_from_client_id IS 'If this record was migrated from the legacy clients table, stores the original client.id for audit.';

-- ============================================
-- 7. INDEXES FOR NEW FIELDS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_contact_type 
    ON public.leads(contact_type);

CREATE INDEX IF NOT EXISTS idx_leads_contact_type_org 
    ON public.leads(organization_id, contact_type);

CREATE INDEX IF NOT EXISTS idx_leads_deleted_at 
    ON public.leads(deleted_at) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_portal_token 
    ON public.leads(portal_token) WHERE portal_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_portal_short_token 
    ON public.leads(portal_short_token) WHERE portal_short_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_nit 
    ON public.leads(nit) WHERE nit IS NOT NULL;

-- ============================================
-- 8. SET EXISTING LEADS AS contact_type = 'lead'
-- (Backfill for records created before this migration)
-- ============================================
UPDATE public.leads 
SET contact_type = 'lead' 
WHERE contact_type IS NULL;

-- ============================================
-- SUCCESS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ CRM Entity Consolidation Step 1 Complete';
    RAISE NOTICE '   - Added contact_type discriminator';
    RAISE NOTICE '   - Added billing identity fields (nit, address, logo_url)';
    RAISE NOTICE '   - Added portal access fields';
    RAISE NOTICE '   - Added social media fields';
    RAISE NOTICE '   - Added soft delete (deleted_at)';
    RAISE NOTICE '   - Added migration tracking (migrated_from_client_id)';
    RAISE NOTICE '   - Created optimized indexes';
    RAISE NOTICE '   ⚠️ NEXT: Run Step 2 to migrate data from clients table';
END $$;
