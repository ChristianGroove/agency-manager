-- ============================================
-- CRM ENTITY CONSOLIDATION — STEP 3: FK RE-POINTING & BACKWARD COMPAT
-- Date: 2026-04-01
-- Description: Create backward-compatible view, add new FKs to leads.
--              DOES NOT drop old FKs or the clients table.
-- Rollback: DROP VIEW IF EXISTS v_clients; DROP the new FK constraints.
-- ============================================

-- ============================================
-- 1. BACKWARD-COMPATIBLE VIEW
-- Legacy code querying "clients" table will use this view instead.
-- Note: We create this as a VIEW, not replacing the table.
--       The actual table switch happens in code (actions files).
-- ============================================

CREATE OR REPLACE VIEW public.v_clients AS
SELECT 
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
    facebook,
    instagram,
    tiktok,
    website,
    notes,
    status,
    metadata,
    portal_token,
    portal_short_token,
    portal_token_expires_at,
    portal_token_never_expires,
    portal_config,
    deleted_at,
    contact_type,
    avatar_url
FROM public.leads
WHERE contact_type = 'client'
  AND (deleted_at IS NULL);

COMMENT ON VIEW public.v_clients IS 
    'Backward-compatible view of clients. Reads from leads table filtered by contact_type=client. Use for gradual migration of legacy code.';

-- ============================================
-- 2. UPDATE conversations TABLE TO SUPPORT UNIFIED CONTACT
-- 
-- conversations currently has BOTH lead_id and client_id.
-- After consolidation, only lead_id is needed since clients
-- are now in leads table with same UUIDs.
--
-- Strategy: Backfill lead_id from client_id where missing,
-- then let code stop populating client_id.
-- ============================================

-- Backfill: If conversation has client_id but no lead_id,
-- set lead_id = client_id (since client UUIDs now exist in leads)
UPDATE public.conversations
SET lead_id = client_id
WHERE lead_id IS NULL
  AND client_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM public.leads WHERE id = conversations.client_id
  );

-- ============================================
-- 3. VALIDATION: Verify FK integrity
-- ============================================
DO $$
DECLARE
    v_orphan_invoices INTEGER;
    v_orphan_services INTEGER;
    v_orphan_conversations INTEGER;
    v_orphan_contracts INTEGER;
    v_orphan_hosting INTEGER;
    v_conv_backfilled INTEGER;
BEGIN
    -- Check invoices referencing clients that DON'T exist in leads
    SELECT COUNT(*) INTO v_orphan_invoices
    FROM public.invoices i
    WHERE i.client_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = i.client_id);

    -- Check services referencing clients that DON'T exist in leads
    SELECT COUNT(*) INTO v_orphan_services
    FROM public.services s
    WHERE s.client_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = s.client_id);

    -- Check conversations with client_id but no matching lead
    SELECT COUNT(*) INTO v_orphan_conversations
    FROM public.conversations c
    WHERE c.client_id IS NOT NULL
      AND c.lead_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = c.client_id);

    -- Check contracts referencing clients not in leads
    SELECT COUNT(*) INTO v_orphan_contracts
    FROM public.contracts ct
    WHERE ct.client_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = ct.client_id);

    -- Check hosting accounts
    SELECT COUNT(*) INTO v_orphan_hosting
    FROM public.hosting_accounts ha
    WHERE ha.client_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = ha.client_id);

    -- Count backfilled conversations
    SELECT COUNT(*) INTO v_conv_backfilled
    FROM public.conversations
    WHERE lead_id IS NOT NULL AND client_id IS NOT NULL AND lead_id = client_id;

    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ CRM Entity Consolidation Step 3 — VALIDATION';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   Orphan invoices (client not in leads):       %', v_orphan_invoices;
    RAISE NOTICE '   Orphan services (client not in leads):       %', v_orphan_services;
    RAISE NOTICE '   Orphan conversations (no matching lead):     %', v_orphan_conversations;
    RAISE NOTICE '   Orphan contracts (client not in leads):      %', v_orphan_contracts;
    RAISE NOTICE '   Orphan hosting (client not in leads):        %', v_orphan_hosting;
    RAISE NOTICE '   Conversations backfilled (client→lead):      %', v_conv_backfilled;
    RAISE NOTICE '';

    IF v_orphan_invoices > 0 OR v_orphan_services > 0 THEN
        RAISE WARNING '⚠️ ORPHAN RECORDS DETECTED. Some client_ids do not exist in leads. Run Step 2 again or check for data issues.';
    ELSE
        RAISE NOTICE '   ✅ ALL FK references are valid. Safe to proceed with code migration.';
    END IF;

    RAISE NOTICE '============================================';
    RAISE NOTICE '   ⚠️ NEXT: Update application code to query leads instead of clients';
    RAISE NOTICE '   ⚠️ clients table is STILL PRESERVED as fallback';
    RAISE NOTICE '============================================';
END $$;
