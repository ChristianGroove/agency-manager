-- Function to cancel orphaned invoices
CREATE OR REPLACE FUNCTION public.cancel_invoices_on_service_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if deleted_at was just set (transition from NULL to Value)
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        UPDATE public.invoices
        SET status = 'cancelled'
        WHERE service_id = NEW.id
        AND status IN ('pending', 'overdue');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_service_soft_delete_cancel_invoices ON public.services;

CREATE TRIGGER on_service_soft_delete_cancel_invoices
AFTER UPDATE OF deleted_at ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.cancel_invoices_on_service_soft_delete();
