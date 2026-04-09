-- ============================================
-- CRM ENTITY CONSOLIDATION — STEP 5: REDIRECT FKS TO LEADS
-- Date: 2026-04-01
-- Description: Drop existing physical FKs pointing to clients(id) 
-- and replace them with FKs pointing to leads(id) so that 
-- new 'client' leads can have invoices, and so that PostgREST 
-- understands the relationship for nested fetching (.select('invoices(*)'))
-- ============================================

-- INVOICES
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- SERVICES
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_client_id_fkey;
-- Note: Check if there's another name like services_client_id_fkey1
ALTER TABLE public.services
    ADD CONSTRAINT services_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- QUOTES
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;
ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- SUBSCRIPTIONS
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_client_id_fkey;
ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- HOSTING ACCOUNTS
ALTER TABLE public.hosting_accounts DROP CONSTRAINT IF EXISTS hosting_accounts_client_id_fkey;
ALTER TABLE public.hosting_accounts
    ADD CONSTRAINT hosting_accounts_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- CONTRACTS
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_client_id_fkey;
ALTER TABLE public.contracts
    ADD CONSTRAINT contracts_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;
