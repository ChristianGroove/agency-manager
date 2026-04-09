-- Add Communication Settings columns to organization_settings table

alter table public.organization_settings 
add column if not exists comm_whatsapp_number text,
add column if not exists comm_whatsapp_prefix text default '57',
add column if not exists comm_sender_name text,
add column if not exists comm_assisted_mode boolean default true,
add column if not exists comm_templates jsonb default '{
    "invoice_sent": "Hola {{cliente}}, te enviamos tu factura #{{factura}} por valor de {{monto}}. Puedes verla y pagarla aquí: {{link}}",
    "payment_reminder": "Hola {{cliente}}, recordatorio amable de tu factura #{{factura}} pendiente por {{monto}}. Link de pago: {{link}}",
    "payment_confirmation": "¡Gracias {{cliente}}! Hemos recibido tu pago de {{monto}} por la factura #{{factura}}.",
    "briefing_sent": "Hola {{cliente}}, necesitamos tu ayuda con este briefing para avanzar: {{link}}",
    "briefing_completed": "¡Gracias {{cliente}}! Hemos recibido tu briefing completado."
}'::jsonb;
