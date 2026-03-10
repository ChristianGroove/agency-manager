-- FIX: Tenant Total Deletion (Nuclear Cleanup)
-- Description: Updates all organization_id Foreign Keys to use ON DELETE CASCADE.
-- This allows deleting an organization and automatically purging all its data.
-- Reason: Fix for Error 23503 when trying to delete a tenant definitively.

-- 1. Notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_organization_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Organization Settings
ALTER TABLE public.organization_settings DROP CONSTRAINT IF EXISTS organization_settings_organization_id_fkey;
ALTER TABLE public.organization_settings ADD CONSTRAINT organization_settings_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 3. Subscriptions
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_organization_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Clients
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_organization_id_fkey;
ALTER TABLE public.clients ADD CONSTRAINT clients_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Services
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_organization_id_fkey;
ALTER TABLE public.services ADD CONSTRAINT services_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 6. Quotes
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_organization_id_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 7. Invoices
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_organization_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 8. Briefings
ALTER TABLE public.briefings DROP CONSTRAINT IF EXISTS briefings_organization_id_fkey;
ALTER TABLE public.briefings ADD CONSTRAINT briefings_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 9. Briefing Templates
ALTER TABLE public.briefing_templates DROP CONSTRAINT IF EXISTS briefing_templates_organization_id_fkey;
ALTER TABLE public.briefing_templates ADD CONSTRAINT briefing_templates_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 10. Service Catalog
ALTER TABLE public.service_catalog DROP CONSTRAINT IF EXISTS service_catalog_organization_id_fkey;
ALTER TABLE public.service_catalog ADD CONSTRAINT service_catalog_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 11. Service Categories
ALTER TABLE public.service_categories DROP CONSTRAINT IF EXISTS service_categories_organization_id_fkey;
ALTER TABLE public.service_categories ADD CONSTRAINT service_categories_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 12. Payment Transactions
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_organization_id_fkey;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 13. Usage Events
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_organization_id_fkey;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_parent_organization_id_fkey;
ALTER TABLE public.usage_events ADD CONSTRAINT usage_events_parent_organization_id_fkey 
FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 14. Parent Organization (Self-reference)
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_parent_organization_id_fkey;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_parent_organization_id_fkey 
FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
