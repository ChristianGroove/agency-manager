-- ============================================
-- PHASE 3: PERFORMANCE TUNING
-- Date: 2026-01-31
-- Objective: Add missing indexes identified during technical audit
-- ============================================

-- 1. Email System Performance (RLS Optimization)
-- These tables are frequently queried by organization_id due to RLS policies.
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON public.email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_org ON public.email_campaigns(organization_id);

-- 2. Recycle Bin Performance (Soft-Delete Filtering)
-- Queries for the Trash Bin filter by "deleted_at IS NOT NULL". 
-- We index this specifically to speed up trash views.
CREATE INDEX IF NOT EXISTS idx_billable_events_deleted ON public.billable_events(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_members_deleted ON public.organization_members(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON public.clients(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_deleted ON public.services(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Capability Lookups
-- If we frequently query "which tier has capability X", a GIN index on capabilities is useful.
CREATE INDEX IF NOT EXISTS idx_branding_tiers_capabilities ON public.branding_tiers USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_organizations_capabilities ON public.organizations USING GIN (capabilities);
