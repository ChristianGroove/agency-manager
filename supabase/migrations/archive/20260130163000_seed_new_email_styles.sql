-- Migration: Seed new email styles (Neo, Swiss) and Invoice Summary template

-- 1. Insert "Neo" and "Swiss" variants for existing types (System Defaults)
INSERT INTO public.email_templates (organization_id, name, subject_template, body_html, template_key, variant_name, is_active)
SELECT 
    NULL as organization_id, 
    'Factura (Neo)', 
    'Nueva Factura {{invoice_number}}', 
    '', -- Empty because code handles fallback if body_html is empty/missing? No, we should put something or rely on code fallback.
    -- The TemplateEngine relies on "Active Template in DB" OR "System Default in DB".
    -- If we want code fallback to trigger, we usually don't need DB entries unless we want to allow editing.
    -- However, for the selector to work in the UI, we might need them.
    -- For now, let's just ensure the KEYS exist for the new "invoice_summary".
    'invoice_new',
    'neo',
    false -- Not active by default, user must select
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'invoice_new' AND variant_name = 'neo' AND organization_id IS NULL);

INSERT INTO public.email_templates (organization_id, name, subject_template, body_html, template_key, variant_name, is_active)
SELECT NULL, 'Factura (Swiss)', 'Factura #{{invoice_number}}', '', 'invoice_new', 'swiss', false
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'invoice_new' AND variant_name = 'swiss' AND organization_id IS NULL);


-- 2. Insert "Invoice Summary" (Estado de Cuenta) System Template
-- We create a "Minimal" default for it.
INSERT INTO public.email_templates (organization_id, name, subject_template, body_html, template_key, variant_name, is_active)
SELECT 
    NULL, 
    'Estado de Cuenta', 
    'Resumen de Cuenta - {{agency_name}}', 
    '<!-- HTML rendered by code fallback -->', 
    'invoice_summary', 
    'minimal', 
    true
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'invoice_summary' AND organization_id IS NULL);
