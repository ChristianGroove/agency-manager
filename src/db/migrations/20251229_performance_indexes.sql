-- PERFORMANCE HARDENING MIGRATION
-- Description: Add indexes to organization_id on all multi-tenant tables to prevent Sequential Scans under RLS.
-- Date: 2025-12-29
-- Author: Antigravity

-- 1. Core Modules (CRM & Billing)
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_org_id ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org_id ON public.proposals(organization_id); -- Previously quotes/proposals
CREATE INDEX IF NOT EXISTS idx_quotes_org_id ON public.quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id);

-- 2. Agency Vertical
CREATE INDEX IF NOT EXISTS idx_briefings_org_id ON public.briefings(organization_id);
CREATE INDEX IF NOT EXISTS idx_briefing_templates_org_id ON public.briefing_templates(organization_id);

-- 3. Cleaning Vertical & Workforce
-- Staff Profiles (If standalone table)
CREATE INDEX IF NOT EXISTS idx_staff_profiles_org_id ON public.cleaning_staff_profiles(organization_id);

-- Staff Shifts
CREATE INDEX IF NOT EXISTS idx_staff_shifts_org_id ON public.staff_shifts(organization_id);

-- Staff Work Logs (Time tracking)
CREATE INDEX IF NOT EXISTS idx_staff_work_logs_org_id ON public.staff_work_logs(organization_id);

-- Appointments/Jobs (The heavy hitter)
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON public.appointments(organization_id);

-- 4. Organization Members Lookups
-- PK is (organization_id, user_id), so org lookup is fast.
-- But user lookup (finding my orgs) needs index on user_id efficiently if not secondary.
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);

-- 5. Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.organization_audit_log(organization_id, created_at DESC);
