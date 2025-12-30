-- PHASE 7: IMMUTABILITY DEFENSE
-- Trigger to protect legal evidence from modification

CREATE OR REPLACE FUNCTION protect_dian_evidence()
RETURNS TRIGGER AS $$
BEGIN
    -- Protection Rule 1: Cannot change xml_signed once set
    IF OLD.xml_signed IS NOT NULL AND NEW.xml_signed IS DISTINCT FROM OLD.xml_signed THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Cannot modify xml_signed once it has been legally sealed.';
    END IF;

    -- Protection Rule 2: Cannot change cufe once set
    IF OLD.cufe IS NOT NULL AND NEW.cufe IS DISTINCT FROM OLD.cufe THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Cannot modify CUFE once it has been legally sealed.';
    END IF;

    -- Protection Rule 3: Cannot change track_id once set
    IF OLD.track_id IS NOT NULL AND NEW.track_id IS DISTINCT FROM OLD.track_id THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Cannot modify TrackID once submitted to DIAN.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_dian_immutability
    BEFORE UPDATE ON dian_documents
    FOR EACH ROW
    EXECUTE FUNCTION protect_dian_evidence();
