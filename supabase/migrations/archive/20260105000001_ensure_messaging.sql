-- ENSURE MESSAGING MODULE EXISTS
INSERT INTO public.system_modules (key, name, description, category, price, is_core, is_active, icon_name)
VALUES (
    'module_messaging',
    'Unified Inbox',
    'WhatsApp, Instagram, and Email in one place.',
    'crm', -- or 'messaging' if category enum allows, defaulting to known safe 'crm' or 'operations'
    0.00,
    TRUE, -- It is core
    TRUE,
    'MessageSquare'
) ON CONFLICT (key) DO NOTHING;

-- ASSIGN TO AGENCY VERTICAL
INSERT INTO public.vertical_modules (vertical_key, module_key, is_core, is_default_enabled, sort_order)
VALUES ('agency', 'module_messaging', TRUE, TRUE, 30)
ON CONFLICT (vertical_key, module_key) DO NOTHING;
