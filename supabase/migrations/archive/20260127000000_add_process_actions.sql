-- Phase 9: Process UX enhancements
-- Add 'suggested_actions' column to process_states to drive UI recommendations.

alter table process_states 
add column if not exists suggested_actions jsonb default '[]'::jsonb;

-- Example structure for suggested_actions:
-- [
--   { "label": "Registrar Pago", "action": "open_invoice_modal", "type": "primary" },
--   { "label": "Enviar Link", "action": "copy_payment_link", "type": "secondary" }
-- ]
