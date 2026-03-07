-- Migration: Sync CRM Tags with Legacy Columns (Fixed)
-- Purpose: Unify the label system while maintaining backward compatibility for production channels.

-- Ensure columns exist just in case
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 1. Function to sync crm_lead_tags to leads.tags (TEXT[])
CREATE OR REPLACE FUNCTION sync_crm_lead_tags_to_leads()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.leads
        SET tags = ARRAY(
            SELECT t.name 
            FROM public.crm_tags t
            JOIN public.crm_lead_tags lt ON lt.tag_id = t.id
            WHERE lt.lead_id = NEW.lead_id
        )
        WHERE id = NEW.lead_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.leads
        SET tags = ARRAY(
            SELECT t.name 
            FROM public.crm_tags t
            JOIN public.crm_lead_tags lt ON lt.tag_id = t.id
            WHERE lt.lead_id = OLD.lead_id
        )
        WHERE id = OLD.lead_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for crm_lead_tags sync
DROP TRIGGER IF EXISTS trg_sync_lead_tags ON public.crm_lead_tags;
CREATE TRIGGER trg_sync_lead_tags
AFTER INSERT OR DELETE ON public.crm_lead_tags
FOR EACH ROW EXECUTE FUNCTION sync_crm_lead_tags_to_leads();

-- 3. Function to sync leads.tags to conversations.tags
CREATE OR REPLACE FUNCTION sync_leads_tags_to_conversations()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if tags actually changed to avoid infinite loops or unnecessary updates
    IF (OLD.tags IS DISTINCT FROM NEW.tags) THEN
        UPDATE public.conversations
        SET tags = NEW.tags
        WHERE lead_id = NEW.id AND state = 'active';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for leads sync to conversations
-- We remove the OF tags restriction and the WHEN clause to make it more resilient to schema states
DROP TRIGGER IF EXISTS trg_sync_leads_to_conv ON public.leads;
CREATE TRIGGER trg_sync_leads_to_conv
AFTER UPDATE ON public.leads
FOR EACH ROW 
EXECUTE FUNCTION sync_leads_tags_to_conversations();

-- 5. Backfill existing tags
UPDATE public.leads l
SET tags = ARRAY(
    SELECT t.name 
    FROM public.crm_tags t
    JOIN public.crm_lead_tags lt ON lt.tag_id = t.id
    WHERE lt.lead_id = l.id
)
WHERE EXISTS (SELECT 1 FROM public.crm_lead_tags WHERE lead_id = l.id);
