-- FIX: Tenant Total Deletion (Giga Cascade v3)
-- Description: Comprehensive update for ALL multi-tenant tables to use ON DELETE CASCADE.
-- This covers First-Level (Direct) and Second-Level (Indirect via members) dependencies.
-- Reason: Fix for persistent Error 23503 and orphaned data blocking tenant deletion.

DO $$ 
BEGIN
    -- 1. DIRECT ORGANIZATION_ID REFERENCES (CASCADE)
    
    -- Notifications
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_organization_id_fkey;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Organization Settings
    ALTER TABLE public.organization_settings DROP CONSTRAINT IF EXISTS organization_settings_organization_id_fkey;
    ALTER TABLE public.organization_settings ADD CONSTRAINT organization_settings_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Subscriptions
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_organization_id_fkey;
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Clients
    ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_organization_id_fkey;
    ALTER TABLE public.clients ADD CONSTRAINT clients_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Services
    ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_organization_id_fkey;
    ALTER TABLE public.services ADD CONSTRAINT services_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Quotes
    ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_organization_id_fkey;
    ALTER TABLE public.quotes ADD CONSTRAINT quotes_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Invoices
    ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_organization_id_fkey;
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Briefings
    ALTER TABLE public.briefings DROP CONSTRAINT IF EXISTS briefings_organization_id_fkey;
    ALTER TABLE public.briefings ADD CONSTRAINT briefings_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Briefing Templates
    ALTER TABLE public.briefing_templates DROP CONSTRAINT IF EXISTS briefing_templates_organization_id_fkey;
    ALTER TABLE public.briefing_templates ADD CONSTRAINT briefing_templates_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Service Catalog
    ALTER TABLE public.service_catalog DROP CONSTRAINT IF EXISTS service_catalog_organization_id_fkey;
    ALTER TABLE public.service_catalog ADD CONSTRAINT service_catalog_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Service Categories
    ALTER TABLE public.service_categories DROP CONSTRAINT IF EXISTS service_categories_organization_id_fkey;
    ALTER TABLE public.service_categories ADD CONSTRAINT service_categories_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Payment Transactions
    ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_organization_id_fkey;
    ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Usage Events
    ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_organization_id_fkey;
    ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_parent_organization_id_fkey;
    ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_parent_organization_id_fkey 
    FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

    -- Staff Shifts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_shifts') THEN
        ALTER TABLE public.staff_shifts DROP CONSTRAINT IF EXISTS staff_shifts_organization_id_fkey;
        ALTER TABLE public.staff_shifts ADD CONSTRAINT staff_shifts_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- Proposals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals') THEN
        ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_organization_id_fkey;
        ALTER TABLE public.proposals ADD CONSTRAINT proposals_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- Conversations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_organization_id_fkey;
        -- Use dynamic check for FK presence or just attempt update
        BEGIN
            ALTER TABLE public.conversations ADD CONSTRAINT conversations_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- Email Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs') THEN
        ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_organization_id_fkey;
        ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- Organization Sequences
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_sequences') THEN
        ALTER TABLE public.organization_sequences DROP CONSTRAINT IF EXISTS organization_sequences_organization_id_fkey;
        ALTER TABLE public.organization_sequences ADD CONSTRAINT organization_sequences_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 2. INDIRECT REFERENCES VIA ORGANIZATION_MEMBERS (SET NULL)
    
    -- Staff Work Logs
    ALTER TABLE public.staff_work_logs DROP CONSTRAINT IF EXISTS staff_work_logs_approved_by_fkey;
    ALTER TABLE public.staff_work_logs ADD CONSTRAINT staff_work_logs_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES public.organization_members(id) ON DELETE SET NULL;

    -- Staff Payroll Periods
    ALTER TABLE public.staff_payroll_periods DROP CONSTRAINT IF EXISTS staff_payroll_periods_closed_by_fkey;
    ALTER TABLE public.staff_payroll_periods ADD CONSTRAINT staff_payroll_periods_closed_by_fkey 
    FOREIGN KEY (closed_by) REFERENCES public.organization_members(id) ON DELETE SET NULL;

    ALTER TABLE public.staff_payroll_periods DROP CONSTRAINT IF EXISTS staff_payroll_periods_processed_by_fkey;
    ALTER TABLE public.staff_payroll_periods ADD CONSTRAINT staff_payroll_periods_processed_by_fkey 
    FOREIGN KEY (processed_by) REFERENCES public.organization_members(id) ON DELETE SET NULL;

    -- Staff Payroll Settlements
    ALTER TABLE public.staff_payroll_settlements DROP CONSTRAINT IF EXISTS staff_payroll_settlements_approved_by_fkey;
    ALTER TABLE public.staff_payroll_settlements ADD CONSTRAINT staff_payroll_settlements_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES public.organization_members(id) ON DELETE SET NULL;

    -- Staff Payments
    ALTER TABLE public.staff_payments DROP CONSTRAINT IF EXISTS staff_payments_registered_by_fkey;
    ALTER TABLE public.staff_payments ADD CONSTRAINT staff_payments_registered_by_fkey 
    FOREIGN KEY (registered_by) REFERENCES public.organization_members(id) ON DELETE SET NULL;

    -- 3. SELF-REFERENCES (SET NULL)
    ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_parent_organization_id_fkey;
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_parent_organization_id_fkey 
    FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

END $$;
