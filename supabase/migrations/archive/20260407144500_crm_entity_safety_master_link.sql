-- ============================================
-- CRM ENTITY SAFETY — MASTER CONTACT LINKING
-- Date: 2026-04-07
-- Description: Adds a master client relationship to the leads table
--              to separate "Pipeline Deals" from "Persistent Contacts".
-- ============================================

-- 1. Add master contact relationship
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS master_contact_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.master_contact_id IS 
    'References the "Master Contact" (contact_type=client) for this lead. Allows multiple pipeline deals for one person.';

-- 2. Add a flag for explicit Master Contacts (optional but helpful)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS is_master_contact BOOLEAN DEFAULT FALSE;

-- 3. Optimization: Index for faster lookup of deals by master contact
CREATE INDEX IF NOT EXISTS idx_leads_master_contact_id 
    ON public.leads(master_contact_id) WHERE master_contact_id IS NOT NULL;

-- 4. Initial "Mastering" Logic (Heuristic): 
-- If a lead has a migrated_from_client_id, it is likely a master contact.
UPDATE public.leads 
SET is_master_contact = TRUE 
WHERE contact_type = 'client' AND migrated_from_client_id IS NOT NULL;

-- 5. NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
