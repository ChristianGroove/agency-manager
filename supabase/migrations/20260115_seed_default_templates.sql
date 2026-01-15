-- Migration to seed default messaging templates for organizations that don't have them
-- This ensures the new dynamic template system has content to work with immediately.

DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM organizations LOOP
        
        -- 1. Invoice Sent
        IF NOT EXISTS (SELECT 1 FROM messaging_templates WHERE organization_id = org.id AND name = 'Invoice Sent') THEN
            INSERT INTO messaging_templates (organization_id, name, category, language, content, components, status)
            VALUES (
                org.id,
                'Invoice Sent',
                'UTILITY',
                'es',
                'Hola {{client}}, te enviamos tu factura #{{factura}} por un total de {{monto}}. Puedes ver los detalles y realizar el pago de forma segura aquí: {{link}}',
                '[{"type": "BODY", "text": "Hola {{client}}, te enviamos tu factura #{{factura}} por un total de {{monto}}. Puedes ver los detalles y realizar el pago de forma segura aquí: {{link}}"}]'::jsonb,
                'APPROVED'
            );
        END IF;

        -- 2. Quote Sent
        IF NOT EXISTS (SELECT 1 FROM messaging_templates WHERE organization_id = org.id AND name = 'Quote Sent') THEN
            INSERT INTO messaging_templates (organization_id, name, category, language, content, components, status)
            VALUES (
                org.id,
                'Quote Sent',
                'UTILITY',
                'es',
                'Hola {{client}}, hemos preparado la cotización #{{cotizacion}}. El valor total es {{monto}}. Puedes revisarla y aprobarla en tu portal de cliente: {{link}}',
                '[{"type": "BODY", "text": "Hola {{client}}, hemos preparado la cotización #{{cotizacion}}. El valor total es {{monto}}. Puedes revisarla y aprobarla en tu portal de cliente: {{link}}"}]'::jsonb,
                'APPROVED'
            );
        END IF;

        -- 3. Portal Invite
        IF NOT EXISTS (SELECT 1 FROM messaging_templates WHERE organization_id = org.id AND name = 'Portal Invite') THEN
            INSERT INTO messaging_templates (organization_id, name, category, language, content, components, status)
            VALUES (
                org.id,
                'Portal Invite',
                'UTILITY',
                'es',
                'Hola {{client}}, bienvenido a {{company}}. Hemos habilitado tu portal de cliente donde podrás consultar tus servicios, facturas y proyectos en tiempo real. Accede aquí: {{link}}',
                '[{"type": "BODY", "text": "Hola {{client}}, bienvenido a {{company}}. Hemos habilitado tu portal de cliente donde podrás consultar tus servicios, facturas y proyectos en tiempo real. Accede aquí: {{link}}"}]'::jsonb,
                'APPROVED'
            );
        END IF;

        -- 4. Billing Summary (New Feature)
        IF NOT EXISTS (SELECT 1 FROM messaging_templates WHERE organization_id = org.id AND name = 'Billing Summary') THEN
            INSERT INTO messaging_templates (organization_id, name, category, language, content, components, status)
            VALUES (
                org.id,
                'Billing Summary',
                'UTILITY',
                'es',
                'Hola {{client}}, te comparto un resumen de tus facturas pendientes por un total de {{total}} ({{count}} facturas). Hemos facilitado el proceso para que puedas regularizar tu cuenta aquí: {{link}}',
                '[{"type": "BODY", "text": "Hola {{client}}, te comparto un resumen de tus facturas pendientes por un total de {{total}} ({{count}} facturas). Hemos facilitado el proceso para que puedas regularizar tu cuenta aquí: {{link}}"}]'::jsonb,
                'APPROVED'
            );
        END IF;

    END LOOP;
END $$;
