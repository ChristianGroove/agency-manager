-- Seed Data for Briefing Templates

DO $$
DECLARE
    v_template_id UUID;
    v_step_id UUID;
BEGIN
    -- 1. Branding / Identity Template
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Identidad de Marca', 'Cuestionario para definir la identidad visual y verbal de la marca.', 'branding-identity')
    RETURNING id INTO v_template_id;

    -- Step 1: General Information
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (v_template_id, 'Información General', 'Datos básicos sobre tu empresa.', 1)
    RETURNING id INTO v_step_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index) VALUES
    (v_step_id, 'Nombre de la Marca', 'brand_name', 'text', true, 1),
    (v_step_id, 'Slogan (si tiene)', 'slogan', 'text', false, 2),
    (v_step_id, 'Descripción de la empresa', 'company_description', 'textarea', true, 3);

    -- Step 2: Target Audience
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (v_template_id, 'Público Objetivo', '¿A quién nos dirigimos?', 2)
    RETURNING id INTO v_step_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index) VALUES
    (v_step_id, 'Rango de Edad', 'target_age', 'text', true, 1),
    (v_step_id, 'Género Principal', 'target_gender', 'select', false, 2), -- Options would be added via JSON update if needed, defaulting simple text for now or we can update options below
    (v_step_id, 'Intereses y Comportamientos', 'target_interests', 'textarea', true, 3);
    
    -- Update options for Gender
    UPDATE briefing_fields SET options = '["Masculino", "Femenino", "Ambos", "Otro"]'::jsonb WHERE name = 'target_gender' AND step_id = v_step_id;

    -- Step 3: Design Preferences
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (v_template_id, 'Preferencias de Diseño', 'Estilo visual deseado.', 3)
    RETURNING id INTO v_step_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index) VALUES
    (v_step_id, 'Colores Preferidos', 'color_preferences', 'text', false, 1),
    (v_step_id, 'Estilo Visual', 'visual_style', 'multiselect', true, 2),
    (v_step_id, 'Adjetivos que definan la marca', 'brand_adjectives', 'text', true, 3);

    UPDATE briefing_fields SET options = '["Minimalista", "Corporativo", "Divertido", "Lujoso", "Tecnológico", "Orgánico"]'::jsonb WHERE name = 'visual_style' AND step_id = v_step_id;


    -- 2. Website Development Template
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Desarrollo Web', 'Requerimientos para el diseño y desarrollo de sitio web.', 'website-dev')
    RETURNING id INTO v_template_id;

    -- Step 1: Project Scope
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (v_template_id, 'Alcance del Proyecto', 'Definición del sitio web.', 1)
    RETURNING id INTO v_step_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index) VALUES
    (v_step_id, 'Tipo de Sitio', 'site_type', 'select', true, 1),
    (v_step_id, '¿Tiene dominio comprado?', 'has_domain', 'boolean', true, 2),
    (v_step_id, 'Sitios web de referencia (Links)', 'references', 'textarea', false, 3);

    UPDATE briefing_fields SET options = '["Corporativo", "Ecommerce", "Landing Page", "Blog/Noticias", "Portafolio"]'::jsonb WHERE name = 'site_type' AND step_id = v_step_id;

    -- Step 2: Functionality
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (v_template_id, 'Funcionalidades', '¿Qué debe hacer el sitio?', 2)
    RETURNING id INTO v_step_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index) VALUES
    (v_step_id, 'Funciones requeridas', 'features', 'multiselect', true, 1),
    (v_step_id, 'Idiomas', 'languages', 'text', true, 2);

    UPDATE briefing_fields SET options = '["Formulario de Contacto", "Chat en vivo", "Pasarela de Pagos", "Reservas/Citas", "Blog", "Integración CRM", "Área de Miembros"]'::jsonb WHERE name = 'features' AND step_id = v_step_id;

END $$;
