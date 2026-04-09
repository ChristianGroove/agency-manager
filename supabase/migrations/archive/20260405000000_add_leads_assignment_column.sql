-- =============================================================================
-- PROFESSIONAL CRM SCHEMA: Leads Assignment Sync
-- =============================================================================
-- Date: 2026-04-05
-- Description: Añade la columna 'assigned_to' a la tabla de leads para alinearla
-- con el estándar de la industria y el sistema de Inbox.
-- =============================================================================

-- 1. Añadir columna a la tabla de leads (Referenciando a perfiles)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);

-- 2. Poblar datos iniciales desde el Inbox (Conversaciones)
-- Esto asegura que no se pierda ninguna asignación previa realizada desde el Inbox.
UPDATE public.leads l
SET assigned_to = c.assigned_to
FROM public.conversations c
WHERE c.lead_id = l.id 
  AND c.assigned_to IS NOT NULL
  AND l.assigned_to IS NULL;

-- 3. Crear función de sincronización automática
-- Mantiene el Lead actualizado cada vez que un Admin cambia el asignado en el Inbox.
CREATE OR REPLACE FUNCTION public.sync_conversation_assignment_to_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar solo si hay un cambio real en el asignado
    IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) OR (TG_OP = 'INSERT') THEN
        UPDATE public.leads 
        SET assigned_to = NEW.assigned_to
        WHERE id = NEW.lead_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Activar el Trigger en la tabla de conversaciones
DROP TRIGGER IF EXISTS tr_sync_assignment_to_lead ON public.conversations;
CREATE TRIGGER tr_sync_assignment_to_lead
AFTER INSERT OR UPDATE OF assigned_to ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.sync_conversation_assignment_to_lead();

-- 5. Índices de rendimiento para filtros de agentes
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

COMMENT ON COLUMN public.leads.assigned_to IS 'Agente asignado al lead, sincronizado automáticamente desde la conversación del Inbox.';
