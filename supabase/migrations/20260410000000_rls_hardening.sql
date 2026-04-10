-- 🔐 20260410000000_rls_hardening.sql
-- Security Hardening for Pixy Multi-tenant Isolation

BEGIN;

--------------------------------------------------------------------------------
-- 1. PAYMENT TRANSACTIONS
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view payment transactions" ON public.payment_transactions;

-- Ensure payment transactions are ONLY visible to members of the same organization
CREATE POLICY "Isolated payment access" ON public.payment_transactions
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

--------------------------------------------------------------------------------
-- 2. EMITTERS (Messaging Configuration)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage emitters" ON public.emitters;

-- Ensure emitters logic is protected - usually emitters are organization-specific
-- This overrides any generic "Authenticated users can do everything"
CREATE POLICY "Isolated emitters access" ON public.emitters
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ))
    WITH CHECK (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

--------------------------------------------------------------------------------
-- 3. META METRICS (Social & Ads)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users view" ON public.meta_social_metrics;

-- Secure social metrics
CREATE POLICY "Isolated social metrics access" ON public.meta_social_metrics
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

-- Note: meta_ads_metrics already has "Clients can view own ads metrics" but we ensure organization isolation
CREATE POLICY "Isolated ads metrics access" ON public.meta_ads_metrics
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

--------------------------------------------------------------------------------
-- 4. BILLING CYCLES
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.billing_cycles;

-- Billing cycles belong to a service, so we check through organization membership
-- (Assuming billing_cycles relates to an organization or service owned by an org)
-- If organization_id is not directly in billing_cycles, we check via organizational ownership.
-- Check: billing_cycles has organization_id according to schema_flows.sql
CREATE POLICY "Isolated billing cycles access" ON public.billing_cycles
     FOR SELECT TO authenticated
     USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

--------------------------------------------------------------------------------
-- 5. SERVICE CATALOG (Platform Hardening)
--------------------------------------------------------------------------------
-- Insecure policies allowed FULL ACCESS (Insert/Update/Delete) to any authenticated user.
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.service_catalog;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.service_catalog;

-- Standard users should ONLY be able to see their own organization's catalog
-- Management is already covered by "Users insert catalog for their org" etc.

--------------------------------------------------------------------------------
-- 6. DASHBOARD BANNERS
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.global_dashboard_banners;
DROP POLICY IF EXISTS "Allow all access to admin users" ON public.global_dashboard_banners;

-- Global banners should be readable by all members of an organization, 
-- but only if they are active and designated for them.
CREATE POLICY "Read active global banners" ON public.global_dashboard_banners
    FOR SELECT TO authenticated
    USING (true); -- Keep as true for reading if it's truly platform-wide content

--------------------------------------------------------------------------------
-- 7. USAGE EVENTS
--------------------------------------------------------------------------------
-- Hardening usage events isolation
DROP POLICY IF EXISTS "Admins can view their organization usage" ON public.usage_events;

CREATE POLICY "Isolated usage access" ON public.usage_events
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

--------------------------------------------------------------------------------
-- 8. SENSITIVE CONFIGURATIONS (API KEYS, SMTP, ACCOUNTS)
--------------------------------------------------------------------------------
-- Hardening Payment Gateway Config (High Risk)
DROP POLICY IF EXISTS "Enable read for organization members" ON public.payment_gateway_config;
CREATE POLICY "Isolated gateway config access" ON public.payment_gateway_config
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

-- Hardening SMTP Configs (Credential Risk)
DROP POLICY IF EXISTS "Users view their own SMTP" ON public.organization_smtp_configs;
CREATE POLICY "Isolated smtp access" ON public.organization_smtp_configs
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

-- Hardening Payment Accounts
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.payment_accounts;
CREATE POLICY "Isolated payment accounts access" ON public.payment_accounts
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

COMMIT;
