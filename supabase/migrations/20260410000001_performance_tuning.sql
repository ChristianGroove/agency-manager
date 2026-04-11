-- 🏎️ 20260410000001_performance_tuning.sql
-- Database Optimization for Pixy Platinum Architecture

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN Trigram Indexes for Fast CRM Searching
-- Ideal for ILIKE '%pattern%' searches on Leads
CREATE INDEX IF NOT EXISTS idx_leads_search_trgm ON public.leads 
USING gin (
    (COALESCE(name, '') || ' ' || 
     COALESCE(company_name, '') || ' ' || 
     COALESCE(email, '') || ' ' || 
     COALESCE(phone, '')) 
    gin_trgm_ops
);

-- 3. Composite Indexes for Reporting
-- Optimizes get_advanced_crm_reports (Abandoned leads logic)
CREATE INDEX IF NOT EXISTS idx_conversations_org_status_waiting ON public.conversations (organization_id, status, waiting_since)
WHERE status = 'open';

-- Optimizes get_advanced_crm_reports (Period updates)
CREATE INDEX IF NOT EXISTS idx_conversations_org_period ON public.conversations (organization_id, updated_at)
INCLUDE (average_response_time_seconds);

-- 4. Billing Infrastructure Optimization
-- Optimizes reseller_activity_log for commission calculations
CREATE INDEX IF NOT EXISTS idx_reseller_activity_lookup ON public.reseller_activity_log 
(reseller_org_id, client_org_id, activity_date DESC);

-- Optimizes revenue_share_rules lookup
-- Note: CURRENT_DATE cannot be used in partial index predicates (not IMMUTABLE).
-- The index covers the composite lookup path; date filtering happens at query time.
CREATE INDEX IF NOT EXISTS idx_revenue_rules_lookup ON public.revenue_share_rules 
(reseller_org_id, phase_start_month, effective_from);

-- 5. Lead Naming Normalization Index (Optional but recommended for identity safety)
CREATE INDEX IF NOT EXISTS idx_leads_identity_lookup ON public.leads (organization_id, contact_type, email) 
WHERE (email IS NOT NULL AND deleted_at IS NULL);
