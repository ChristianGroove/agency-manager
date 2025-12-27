-- PERFORMANCE OPTIMIZATION: Add Indices for Multi-Tenancy
-- This will drastically improve query performance by indexing organization_id

-- 1. Core Tables - Add indices on organization_id
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON public.quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_briefings_organization_id ON public.briefings(organization_id);
CREATE INDEX IF NOT EXISTS idx_briefing_templates_organization_id ON public.briefing_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_organization_id ON public.organization_settings(organization_id);

-- 2. Composite Indices for Common Queries (organization_id + deleted_at)
CREATE INDEX IF NOT EXISTS idx_clients_org_deleted ON public.clients(organization_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_org_deleted ON public.invoices(organization_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_quotes_org_deleted ON public.quotes(organization_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_services_org_deleted ON public.services(organization_id, deleted_at);

-- 3. Composite Indices for Filtering (organization_id + status)
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON public.invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_org_status ON public.quotes(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_services_org_status ON public.services(organization_id, status);

-- 4. Optimize organization_members lookups (used in RLS)
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.organization_members(user_id, organization_id);

-- 5. Analyze tables to update statistics
ANALYZE public.clients;
ANALYZE public.invoices;
ANALYZE public.quotes;
ANALYZE public.services;
ANALYZE public.subscriptions;
ANALYZE public.briefings;
ANALYZE public.organization_members;

-- Verify indices were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%_organization%'
ORDER BY tablename, indexname;
