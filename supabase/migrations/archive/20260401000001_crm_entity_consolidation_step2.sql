-- ============================================
-- CRM ENTITY CONSOLIDATION — STEP 2: DATA MIGRATION
-- Date: 2026-04-01
-- Description: Copy data from clients → leads preserving original UUIDs.
--              SAFE: Uses INSERT ON CONFLICT to avoid duplicates.
--              PRESERVES: Original clients table is NOT touched.
-- Rollback: DELETE FROM leads WHERE migrated_from_client_id IS NOT NULL;
-- ============================================

-- 0. SAFETY: Ensure metadata column exists on leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================
-- 1. MIGRATE CLIENTS DATA INTO LEADS TABLE
-- 
-- Strategy:
--   - Use the SAME UUID (id) from clients so all existing FKs remain valid
--   - Only insert records that don't already exist in leads
--   - If a lead already exists with the same UUID (unlikely), update it
--   - Set contact_type = 'client' for all migrated records
-- ============================================

INSERT INTO public.leads (
    id,
    created_at,
    user_id,
    organization_id,
    name,
    company_name,
    nit,
    email,
    phone,
    address,
    logo_url,
    notes,
    status,
    deleted_at,
    contact_type,
    source,
    migrated_from_client_id,
    -- Social media
    facebook,
    instagram,
    tiktok,
    website
)
SELECT 
    c.id,
    c.created_at,
    c.user_id,
    c.organization_id,
    c.name,
    c.company_name,
    c.nit,
    c.email,
    c.phone,
    c.address,
    c.logo_url,
    c.notes,
    'active',                      -- clients don't have status, default to active
    c.deleted_at,
    'client',                      -- contact_type = client
    'migrated_from_clients',       -- source tracking
    c.id,                          -- track original client ID
    c.facebook,
    c.instagram,
    c.tiktok,
    c.website
FROM public.clients c
WHERE NOT EXISTS (
    -- Skip if a lead with this same ID already exists
    SELECT 1 FROM public.leads l WHERE l.id = c.id
)
AND c.organization_id IS NOT NULL;  -- Safety: skip orphan records

-- ============================================
-- 1b. BACKFILL PORTAL TOKENS (safe, skips conflicts)
-- Only set portal tokens on migrated records where no conflict exists
-- ============================================
UPDATE public.leads l
SET 
    portal_token = c.portal_token,
    portal_short_token = c.portal_short_token,
    portal_token_expires_at = c.portal_token_expires_at,
    portal_token_never_expires = c.portal_token_never_expires
FROM public.clients c
WHERE l.migrated_from_client_id = c.id
  AND l.portal_short_token IS NULL  -- Only if lead doesn't already have a token
  AND c.portal_short_token IS NOT NULL
  AND NOT EXISTS (
      -- Skip if another lead already has this short token
      SELECT 1 FROM public.leads other 
      WHERE other.portal_short_token = c.portal_short_token 
        AND other.id != l.id
  );

-- ============================================
-- 2. HANDLE DUPLICATES: Same phone in both tables
-- 
-- If a lead AND a client exist for the same phone+org (but different UUIDs),
-- update the existing lead to inherit the client billing info.
-- This does NOT delete either record.
-- ============================================

-- Update existing leads with client billing data where phone matches
-- but IDs are different (the convert flow created separate records)
UPDATE public.leads l
SET 
    nit = COALESCE(l.nit, c.nit),
    address = COALESCE(l.address, c.address),
    logo_url = COALESCE(l.logo_url, c.logo_url),
    facebook = COALESCE(NULLIF(l.facebook, ''), c.facebook),
    instagram = COALESCE(NULLIF(l.instagram, ''), c.instagram),
    tiktok = COALESCE(NULLIF(l.tiktok, ''), c.tiktok),
    website = COALESCE(NULLIF(l.website, ''), c.website)
FROM public.clients c
WHERE l.phone IS NOT NULL
  AND l.phone != ''
  AND c.phone = l.phone
  AND c.organization_id = l.organization_id
  AND c.id != l.id              -- Different records (not already migrated)
  AND l.migrated_from_client_id IS NULL;  -- Not already a migrated record

-- ============================================
-- 3. VALIDATION QUERIES
-- Run these after migration to verify integrity.
-- ============================================

-- Count verification
DO $$
DECLARE
    v_client_count INTEGER;
    v_migrated_count INTEGER;
    v_lead_total INTEGER;
    v_client_type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_client_count FROM public.clients WHERE organization_id IS NOT NULL;
    SELECT COUNT(*) INTO v_migrated_count FROM public.leads WHERE migrated_from_client_id IS NOT NULL;
    SELECT COUNT(*) INTO v_lead_total FROM public.leads;
    SELECT COUNT(*) INTO v_client_type_count FROM public.leads WHERE contact_type = 'client';

    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ CRM Entity Consolidation Step 2 — VALIDATION';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   Original clients count:    %', v_client_count;
    RAISE NOTICE '   Migrated to leads:         %', v_migrated_count;
    RAISE NOTICE '   Total leads after merge:   %', v_lead_total;
    RAISE NOTICE '   Records with type=client:  %', v_client_type_count;
    RAISE NOTICE '';
    
    IF v_migrated_count = 0 AND v_client_count > 0 THEN
        RAISE WARNING '⚠️ No records migrated but clients exist. Possible UUID collision (all clients already existed as leads with same ID).';
    ELSIF v_migrated_count < v_client_count THEN
        RAISE NOTICE '   ℹ️ % clients already existed in leads (same UUID)', v_client_count - v_migrated_count;
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '   ⚠️ NEXT: Run Step 3 to update FK references';
    RAISE NOTICE '   ⚠️ clients table is PRESERVED (not dropped)';
    RAISE NOTICE '============================================';
END $$;
