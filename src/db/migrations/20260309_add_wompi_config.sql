-- Insert Wompi configuration if it doesn't exist
INSERT INTO public.payment_gateway_config (
    gateway_name, 
    display_name, 
    is_enabled, 
    secret_key_ref, 
    webhook_secret_ref,
    supports_connect, 
    supports_subscriptions, 
    supports_invoicing, 
    config
) VALUES (
    'wompi', 
    'Wompi', 
    TRUE, 
    'WOMPI_PRIVATE_KEY',
    'WOMPI_EVENTS_SECRET',
    FALSE, 
    TRUE, 
    TRUE,
    '{"currency": "COP", "environment": "Sandbox"}'::JSONB
)
ON CONFLICT (gateway_name) DO UPDATE SET
    supports_subscriptions = TRUE,
    supports_invoicing = TRUE,
    display_name = 'Wompi';
