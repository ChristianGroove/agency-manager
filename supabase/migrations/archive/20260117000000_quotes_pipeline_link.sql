-- Quotes-Pipeline Integration
-- Links quotes to leads and adds status callbacks

-- Add quote_id to leads for direct association
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- Add quote_status for quick display without join
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS quote_status TEXT;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_leads_quote ON leads(quote_id) WHERE quote_id IS NOT NULL;

-- Function to sync lead status when quote status changes
CREATE OR REPLACE FUNCTION sync_quote_to_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- When quote is accepted, move lead to 'won'
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        UPDATE leads 
        SET status = 'won', quote_status = 'accepted'
        WHERE quote_id = NEW.id;
    END IF;
    
    -- When quote is rejected, move lead to 'lost'
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        UPDATE leads 
        SET status = 'lost', quote_status = 'rejected'
        WHERE quote_id = NEW.id;
    END IF;
    
    -- When quote is sent, move lead to 'negotiation'
    IF NEW.status = 'sent' AND OLD.status = 'draft' THEN
        UPDATE leads 
        SET status = 'negotiation', quote_status = 'sent'
        WHERE quote_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on quotes table
DROP TRIGGER IF EXISTS trigger_sync_quote_to_lead ON quotes;
CREATE TRIGGER trigger_sync_quote_to_lead
AFTER UPDATE ON quotes
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_quote_to_lead();
