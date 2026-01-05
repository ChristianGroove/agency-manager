-- Phase 4: Hierarchy - Auto Backfill Parent Org

CREATE OR REPLACE FUNCTION public.set_usage_parent_org()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_organization_id IS NULL THEN
        SELECT parent_organization_id INTO NEW.parent_organization_id
        FROM public.organizations
        WHERE id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_usage_parent_org
    BEFORE INSERT ON public.usage_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_usage_parent_org();
