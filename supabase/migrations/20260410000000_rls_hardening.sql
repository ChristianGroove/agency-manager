-- 🔐 20260410000000_rls_hardening.sql
-- Security Hardening for Pixy Multi-tenant Isolation
-- IDEMPOTENT: All CREATE POLICY statements are preceded by DROP POLICY IF EXISTS

BEGIN;

--------------------------------------------------------------------------------
-- 1. PAYMENT TRANSACTIONS
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Isolated payment access" ON public.payment_transactions;

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
DROP POLICY IF EXISTS "Isolated emitters access" ON public.emitters;

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
-- Note: These tables use client_id (FK to clients), NOT organization_id.
-- Isolation is achieved by joining through clients.organization_id.
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users view" ON public.meta_social_metrics;
DROP POLICY IF EXISTS "Isolated social metrics access" ON public.meta_social_metrics;

-- Secure social metrics via client -> organization path
CREATE POLICY "Isolated social metrics access" ON public.meta_social_metrics
    FOR SELECT TO authenticated
    USING (client_id IN (
        SELECT c.id FROM public.clients c
        WHERE c.organization_id IN (
            SELECT om.organization_id FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    ));

-- Note: meta_ads_metrics also uses client_id, not organization_id
DROP POLICY IF EXISTS "Clients can view own ads metrics" ON public.meta_ads_metrics;
DROP POLICY IF EXISTS "Isolated ads metrics access" ON public.meta_ads_metrics;

CREATE POLICY "Isolated ads metrics access" ON public.meta_ads_metrics
    FOR SELECT TO authenticated
    USING (client_id IN (
        SELECT c.id FROM public.clients c
        WHERE c.organization_id IN (
            SELECT om.organization_id FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    ));

--------------------------------------------------------------------------------
-- 4. BILLING CYCLES
-- Note: billing_cycles has service_id (FK to services), NOT organization_id.
-- Isolation is achieved by joining through services.organization_id.
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.billing_cycles;
DROP POLICY IF EXISTS "Isolated billing cycles access" ON public.billing_cycles;

-- Billing cycles belong to a service, so we check through service -> organization
CREATE POLICY "Isolated billing cycles access" ON public.billing_cycles
     FOR SELECT TO authenticated
     USING (service_id IN (
        SELECT s.id FROM public.services s
        WHERE s.organization_id IN (
            SELECT om.organization_id FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    ));

--------------------------------------------------------------------------------
-- 5. SERVICE CATALOG (Platform Hardening)
--------------------------------------------------------------------------------
-- CRITICAL FIX: Insecure policies allowed FULL ACCESS (Insert/Update/Delete) to any authenticated user.
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.service_catalog;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.service_catalog;
DROP POLICY IF EXISTS "Read access for all" ON public.service_catalog;
DROP POLICY IF EXISTS "Admin full access" ON public.service_catalog;

-- Read access is global for all authenticated users
CREATE POLICY "Read access for all" ON public.service_catalog
    FOR SELECT TO authenticated
    USING (true);

-- Manipulation is ONLY for platform admins (Superadmins)
-- We check platform_role in public.profiles
CREATE POLICY "Admin full access" ON public.service_catalog
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND platform_role IN ('admin', 'superadmin')
    ));

--------------------------------------------------------------------------------
-- 6. DASHBOARD BANNERS (Space Hardening)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.global_dashboard_banners;
DROP POLICY IF EXISTS "Allow all access to admin users" ON public.global_dashboard_banners;
DROP POLICY IF EXISTS "Read active global banners" ON public.global_dashboard_banners;
DROP POLICY IF EXISTS "Isolated space banners access" ON public.global_dashboard_banners;
DROP POLICY IF EXISTS "Admin manage banners" ON public.global_dashboard_banners;

-- Banners are read by everyone, but strictly filtered by space_type in the app
CREATE POLICY "Isolated space banners access" ON public.global_dashboard_banners
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Management ONLY for platform admins
CREATE POLICY "Admin manage banners" ON public.global_dashboard_banners
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND platform_role IN ('admin', 'superadmin')
    ));

--------------------------------------------------------------------------------
-- 7. USAGE EVENTS
--------------------------------------------------------------------------------
-- Hardening usage events isolation
DROP POLICY IF EXISTS "Admins can view their organization usage" ON public.usage_events;
DROP POLICY IF EXISTS "Isolated usage access" ON public.usage_events;

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
-- Note: payment_gateway_config is a PLATFORM-LEVEL table (no organization_id).
-- Read access for all authenticated users, write access only for platform admins.
DROP POLICY IF EXISTS "Enable read for organization members" ON public.payment_gateway_config;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.payment_gateway_config;
DROP POLICY IF EXISTS "Read gateway config" ON public.payment_gateway_config;
DROP POLICY IF EXISTS "Admin manage gateway config" ON public.payment_gateway_config;

CREATE POLICY "Read gateway config" ON public.payment_gateway_config
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admin manage gateway config" ON public.payment_gateway_config
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND platform_role IN ('admin', 'superadmin')
    ));

-- Hardening SMTP Configs (Credential Risk)
DROP POLICY IF EXISTS "Users view their own SMTP" ON public.organization_smtp_configs;
DROP POLICY IF EXISTS "Isolated smtp access" ON public.organization_smtp_configs;

CREATE POLICY "Isolated smtp access" ON public.organization_smtp_configs
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

-- Hardening Payment Accounts
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.payment_accounts;
DROP POLICY IF EXISTS "Isolated payment accounts access" ON public.payment_accounts;

CREATE POLICY "Isolated payment accounts access" ON public.payment_accounts
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

COMMIT;
