-- Performance Optimization Indexes for Organizations
-- Migration: 20260204170000_optimize_performance.sql

-- ======================
-- ORGANIZATIONS TABLE
-- ======================

-- Index for parent_organization_id lookups (reseller filtering)
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id 
ON public.organizations(parent_organization_id) 
WHERE parent_organization_id IS NOT NULL;

-- Index for organization_type filtering
CREATE INDEX IF NOT EXISTS idx_organizations_type 
ON public.organizations(organization_type);

-- Index for created_at ordering (used in dashboards and tables)
CREATE INDEX IF NOT EXISTS idx_organizations_created_at 
ON public.organizations(created_at DESC);

-- Composite index for common query pattern (type + parent)
CREATE INDEX IF NOT EXISTS idx_organizations_type_parent 
ON public.organizations(organization_type, parent_organization_id);

-- ======================
-- ORGANIZATION_MEMBERS TABLE
-- ======================

-- Index for user_id lookups (sidebar switcher)
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id 
ON public.organization_members(user_id);

-- Composite index for user + organization lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org 
ON public.organization_members(user_id, organization_id);

-- ======================
-- DASHBOARD QUERIES
-- ======================

-- Clients table - for dashboard counts
CREATE INDEX IF NOT EXISTS idx_clients_org_id 
ON public.clients(organization_id) 
WHERE deleted_at IS NULL;

-- Invoices table - for revenue calculations
CREATE INDEX IF NOT EXISTS idx_invoices_org_status 
ON public.invoices(organization_id, status) 
WHERE deleted_at IS NULL;

-- Services table - for active services count
CREATE INDEX IF NOT EXISTS idx_services_org_status 
ON public.services(organization_id, status) 
WHERE deleted_at IS NULL;

-- Composite index for invoice totals
CREATE INDEX IF NOT EXISTS idx_invoices_org_total 
ON public.invoices(organization_id, total, status) 
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_organizations_parent_id IS 'Speeds up reseller child org queries';
COMMENT ON INDEX idx_organization_members_user_id IS 'Speeds up sidebar organization switcher';
COMMENT ON INDEX idx_clients_org_id IS 'Speeds up dashboard client counts';
COMMENT ON INDEX idx_invoices_org_status IS 'Speeds up dashboard revenue calculations';
