-- ============================================
-- CRM ENTITY CONSOLIDATION — STEP 5 (PART 2): REMAINING REDIRECTIONS
-- Date: 2026-04-07
-- Description: Redirect foreign keys for tables missed in the initial 
-- CRM consolidation migration (Step 5) to the public.leads table.
-- ============================================

-- BRIEFINGS
ALTER TABLE public.briefings DROP CONSTRAINT IF EXISTS briefings_client_id_fkey;
ALTER TABLE public.briefings
    ADD CONSTRAINT briefings_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- CLIENT EVENTS (Portal notifications/log)
ALTER TABLE public.client_events DROP CONSTRAINT IF EXISTS client_events_client_id_fkey;
ALTER TABLE public.client_events
    ADD CONSTRAINT client_events_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- BRIEFING RESPONSES (Check if it has client_id - usually only briefing_id)
-- Just in case, as some versions might have it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefing_responses' AND column_name = 'client_id') THEN
        ALTER TABLE public.briefing_responses DROP CONSTRAINT IF EXISTS briefing_responses_client_id_fkey;
        ALTER TABLE public.briefing_responses
            ADD CONSTRAINT briefing_responses_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE CASCADE;
    END IF;
END $$;

-- NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
