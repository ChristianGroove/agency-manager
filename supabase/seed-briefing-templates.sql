-- NEW BRIEFING TEMPLATES FOR PIXY AGENCY
-- Aligned with catalog services and service categories
-- This script creates 7 comprehensive briefing templates

TRUNCATE TABLE briefing_templates CASCADE;

DO $$
DECLARE
    t_id UUID;
    s_id UUID;
BEGIN
    -- ============================================================
    -- 1. BRANDING & IDENTIDAD
    -- Applies to: Brand Manual Pro, SGM, Brand System, Rebranding
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Branding & Identidad', 'Para proyectos de identidad visual: Brand Manual Pro, Short Guide Mark, Brand System Advanced y Rebranding Estratégico.', 'branding-identidad')
    RETURNING id INTO t_id;

    -- Step 1: Contexto de Marca
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Contexto de Marca', 'Información básica de la marca y su estado actual.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Nombre legal y nombre comercial', 'legal_commercial_name', 'text', true, 1, null),
    (s_id, '¿La marca ya existe o está en creación?', 'brand_status', 'select', true, 2, '["Ya existe", "Está en creación", "Rebranding de marca existente"]'::jsonb),
    (s_id, '¿Hace cuánto opera? (aprox.)', 'years_operating', 'select', true, 3, '["Menos de 1 año", "1-3 años", "3-5 años", "5-10 años", "Más de 10 años", "Aún no existe"]'::jsonb),
    (s_id, '¿En qué mercado compite?', 'market', 'textarea', true, 4, null),
    (s_id, '¿Qué problema resuelve?', 'problem_solved', 'textarea', true, 5, null);

    -- Step 2: Objetivo del Proyecto
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo del Proyecto', 'Por qué trabajar la identidad y qué debe lograr.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Por qué decides trabajar la identidad ahora?', 'why_now', 'textarea', true, 1, null),
    (s_id, '¿Qué debe lograr esta identidad?', 'identity_goals', 'multiselect', true, 2, '["Posicionamiento", "Profesionalización", "Diferenciación", "Escalabilidad", "Coherencia visual", "Conexión emocional"]'::jsonb),
    (s_id, '¿Cómo medirías el éxito de este proyecto?', 'success_metric', 'textarea', true, 3, null);

    -- Step 3: Público Objetivo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Público Objetivo', 'A quién le habla la marca.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Tipo de cliente ideal (descripción)', 'ideal_client', 'textarea', true, 1, null),
    (s_id, 'Edad y perfil demográfico', 'demographics', 'text', true, 2, null),
    (s_id, '¿B2B, B2C o mixto?', 'business_model', 'select', true, 3, '["B2B (Empresas)", "B2C (Consumidor final)", "Mixto"]'::jsonb),
    (s_id, '¿Qué debe sentir el cliente al ver la marca?', 'desired_feeling', 'textarea', true, 4, null);

    -- Step 4: Personalidad & Percepción
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Personalidad & Percepción', 'El carácter de la marca.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'La marca se siente más: (Formal / Cercana)', 'personality_formal', 'select', true, 1, '["Muy formal", "Formal", "Equilibrada", "Cercana", "Muy cercana"]'::jsonb),
    (s_id, 'La marca se siente más: (Premium / Accesible)', 'personality_premium', 'select', true, 2, '["Muy premium/exclusiva", "Premium", "Equilibrada", "Accesible", "Muy accesible"]'::jsonb),
    (s_id, 'La marca se siente más: (Técnica / Emocional)', 'personality_technical', 'select', true, 3, '["Muy técnica/racional", "Técnica", "Equilibrada", "Emocional", "Muy emocional"]'::jsonb),
    (s_id, '3 adjetivos que definan la marca', 'adjectives', 'text', true, 4, null),
    (s_id, '3 cosas que NO debe ser la marca', 'anti_adjectives', 'text', true, 5, null);

    -- Step 5: Referencias Visuales
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Referencias Visuales', 'Inspiración y referencias.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Marcas que te gusten (y por qué)', 'brand_likes', 'textarea', false, 1, null),
    (s_id, 'Marcas que NO te gusten (y por qué)', 'brand_dislikes', 'textarea', false, 2, null),
    (s_id, 'Colores deseados (si existen)', 'preferred_colors', 'text', false, 3, null),
    (s_id, 'Tipografías conocidas que te gusten (opcional)', 'preferred_fonts', 'text', false, 4, null);

    -- Step 6: Alcance y Usos
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Alcance y Usos', 'Dónde se aplicará la marca.', 6)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Dónde se usará la marca?', 'usage_channels', 'multiselect', true, 1, '["Web", "Redes sociales", "Impresos", "Producto/Packaging", "Señalética", "Presentaciones"]'::jsonb),
    (s_id, '¿Hay restricciones legales o sectoriales?', 'legal_restrictions', 'textarea', false, 2, null);

    -- Step 7: Validación
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Validación', 'Proceso de aprobación.', 7)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Quién aprueba internamente?', 'approver', 'text', true, 1, null),
    (s_id, '¿En cuántas rondas de revisión?', 'revision_rounds', 'select', true, 2, '["1 ronda", "2 rondas", "3 rondas", "A definir"]'::jsonb),
    (s_id, 'Comentarios finales', 'final_comments', 'textarea', false, 3, null);


    -- ============================================================
    -- 2. UX / UI & PRODUCTO DIGITAL
    -- Applies to: UX/UI Design, UX Research Sprint, UI System, Vibe Coding
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('UX / UI & Producto Digital', 'Para diseño de interfaces, research, sistemas y prototipado avanzado.', 'ux-ui-producto-digital')
    RETURNING id INTO t_id;

    -- Step 1: Producto
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Producto', 'Qué es y en qué estado está.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué es el producto? (descripción)', 'product_description', 'textarea', true, 1, null),
    (s_id, '¿Está en idea, MVP o producción?', 'product_stage', 'select', true, 2, '["Idea/concepto", "MVP/Prototipo", "Producción", "Producto maduro"]'::jsonb),
    (s_id, '¿Qué problema resuelve?', 'problem_solved', 'textarea', true, 3, null);

    -- Step 2: Usuarios
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Usuarios', 'Quién usa el producto.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Quién lo usa? (perfil)', 'user_profile', 'textarea', true, 1, null),
    (s_id, '¿Qué tan técnico es el usuario?', 'user_technical_level', 'select', true, 2, '["Muy técnico", "Técnico", "Promedio", "No técnico", "Mixto"]'::jsonb),
    (s_id, '¿Frecuencia de uso esperada?', 'usage_frequency', 'select', true, 3, '["Diaria", "Semanal", "Mensual", "Ocasional"]'::jsonb);

    -- Step 3: Objetivo UX
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo UX', 'Qué debe lograr el usuario.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué acción clave debe lograr el usuario?', 'key_action', 'textarea', true, 1, null),
    (s_id, '¿Dónde se pierde el usuario hoy? (si aplica)', 'current_pain_points', 'textarea', false, 2, null),
    (s_id, 'Métrica principal de éxito', 'success_metric', 'textarea', true, 3, null);

    -- Step 4: Alcance del Diseño
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Alcance del Diseño', 'Qué se diseñará.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué se diseñará?', 'design_scope', 'multiselect', true, 1, '["Pantallas específicas", "Flujos completos", "Sistema de diseño", "Componentes", "Wireframes", "Prototipos interactivos"]'::jsonb),
    (s_id, '¿Hay wireframes o diseños previos?', 'has_wireframes', 'boolean', true, 2, null);

    -- Step 5: Referencias
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Referencias', 'Inspiración y benchmarks.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Apps o productos similares que te gustan', 'product_likes', 'textarea', false, 1, null),
    (s_id, 'Qué funciona / qué no funciona en esos productos', 'what_works', 'textarea', false, 2, null);

    -- Step 6: Restricciones
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Restricciones', 'Limitaciones técnicas y de tiempo.', 6)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Tecnología o plataforma específica', 'technology', 'text', false, 1, null),
    (s_id, 'Tiempos esperados', 'timeline', 'text', false, 2, null),
    (s_id, 'Limitaciones técnicas conocidas', 'technical_limitations', 'textarea', false, 3, null);


    -- ============================================================
    -- 3. WEB & ECOMMERCE
    -- Applies to: Web Corporativa, Web de Conversión, Ecommerce Base/Avanzado
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Web & Ecommerce', 'Para sitios corporativos, webs de conversión y tiendas online.', 'web-ecommerce')
    RETURNING id INTO t_id;

    -- Step 1: Contexto del Negocio
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Contexto del Negocio', 'Información de la empresa.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Tipo de empresa', 'company_type', 'text', true, 1, null),
    (s_id, 'Oferta principal (productos/servicios)', 'main_offering', 'textarea', true, 2, null),
    (s_id, 'Mercado objetivo', 'target_market', 'text', true, 3, null);

    -- Step 2: Objetivo del Sitio
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo del Sitio', 'Para qué servirá la web.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Objetivo principal', 'site_goal', 'multiselect', true, 1, '["Informar", "Generar leads", "Vender", "Automatizar procesos", "Soporte", "Posicionamiento de marca"]'::jsonb),
    (s_id, 'Acción principal esperada del usuario', 'main_cta', 'textarea', true, 2, null);

    -- Step 3: Contenido
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Contenido', 'Material disponible para el sitio.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Tiene textos?', 'has_copy', 'boolean', true, 1, null),
    (s_id, '¿Tiene imágenes de calidad?', 'has_images', 'boolean', true, 2, null),
    (s_id, '¿Quién provee qué? (textos, fotos, etc.)', 'content_provider', 'textarea', true, 3, null);

    -- Step 4: Funcionalidades
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Funcionalidades', 'Qué debe hacer el sitio.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Funcionalidades necesarias', 'features', 'multiselect', true, 1, '["Formularios", "Pagos/checkout", "Integraciones (CRM, email, etc.)", "Automatizaciones", "Blog", "Área de clientes", "Chat", "Reservas/citas"]'::jsonb),
    (s_id, 'Detalles específicos de funcionalidades', 'feature_details', 'textarea', false, 2, null);

    -- Step 5: Referencias
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Referencias', 'Inspiración visual.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Sitios que te gustan (URLs)', 'site_likes', 'textarea', false, 1, null),
    (s_id, 'Sitios que odias o NO quieres parecer', 'site_dislikes', 'textarea', false, 2, null);

    -- Step 6: Conversión
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Conversión', 'Acción clave esperada.', 6)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Acción principal esperada', 'conversion_action', 'textarea', true, 1, null),
    (s_id, 'CTA clave (Call to Action)', 'main_cta', 'text', true, 2, null);


    -- ============================================================
    -- 4. MARKETING & GROWTH
    -- Applies to: Marketing Digital, Marketing + Meta Ads, Growth Sprint
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Marketing & Growth', 'Para campañas de marketing digital, Meta Ads y estrategias de crecimiento.', 'marketing-growth')
    RETURNING id INTO t_id;

    -- Step 1: Estado Actual
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Estado Actual', 'Situación y experiencia previa.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Canales activos actualmente', 'active_channels', 'multiselect', false, 1, '["Instagram", "Facebook", "Google Ads", "LinkedIn", "TikTok", "Email", "WhatsApp Business", "Ninguno aún"]'::jsonb),
    (s_id, 'Resultados actuales (si aplica)', 'current_results', 'textarea', false, 2, null),
    (s_id, 'Historial de campañas anteriores', 'campaign_history', 'textarea', false, 3, null);

    -- Step 2: Objetivo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo', 'Qué quieres lograr.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Objetivo principal', 'marketing_goal', 'select', true, 1, '["Ventas", "Leads/contactos", "Reconocimiento de marca", "Retención de clientes", "Tráfico web"]'::jsonb),
    (s_id, 'Objetivo secundario', 'secondary_goal', 'select', false, 2, '["Ventas", "Leads/contactos", "Reconocimiento de marca", "Retención de clientes", "Tráfico web", "N/A"]'::jsonb);

    -- Step 3: Público
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Público', 'A quién le hablas.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Perfil del cliente ideal', 'ideal_client_profile', 'textarea', true, 1, null),
    (s_id, 'Dolor principal que resuelves', 'main_pain_point', 'textarea', true, 2, null);

    -- Step 4: Presupuesto & Ritmo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Presupuesto & Ritmo', 'Inversión y expectativas.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Inversión estimada mensual (pauta)', 'monthly_budget', 'select', true, 1, '["Menos de $1M COP", "$1M-$3M COP", "$3M-$5M COP", "$5M-$10M COP", "Más de $10M COP"]'::jsonb),
    (s_id, 'Horizonte de resultados esperado', 'results_timeline', 'select', true, 2, '["1 mes", "3 meses", "6 meses", "12+ meses"]'::jsonb);

    -- Step 5: KPIs
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'KPIs', 'Cómo mides éxito y fracaso.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué se considera éxito?', 'success_definition', 'textarea', true, 1, null),
    (s_id, '¿Qué se considera fracaso?', 'failure_definition', 'textarea', true, 2, null);


    -- ============================================================
    -- 5. SOCIAL MEDIA & CONTENIDO
    -- Applies to: Social Media Plans (Basic, Standard, Premium), Content Production
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Social Media & Contenido', 'Para gestión de redes sociales y producción de contenido.', 'social-media-contenido')
    RETURNING id INTO t_id;

    -- Step 1: Marca y Voz
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Marca y Voz', 'Cómo habla la marca.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Cómo habla la marca?', 'brand_voice', 'select', true, 1, '["Muy formal", "Profesional pero cercana", "Casual y amigable", "Divertida/irreverente"]'::jsonb),
    (s_id, 'Nivel de formalidad', 'formality_level', 'select', true, 2, '["Muy formal (usted)", "Formal (usted/tú mixto)", "Informal (tú)", "Muy informal (vos/jerga)"]'::jsonb),
    (s_id, '¿Usamos emojis?', 'use_emojis', 'select', true, 3, '["Sí, frecuentemente", "Sí, moderadamente", "Muy poco", "No"]'::jsonb);

    -- Step 2: Plataformas
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Plataformas', 'Dónde publicaremos.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Plataformas a gestionar', 'platforms', 'multiselect', true, 1, '["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Twitter/X", "Pinterest"]'::jsonb),
    (s_id, 'Prioridad por plataforma', 'platform_priority', 'textarea', false, 2, null);

    -- Step 3: Objetivo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo', 'Qué buscas con redes sociales.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Objetivo principal de redes', 'social_goal', 'select', true, 1, '["Visibilidad/alcance", "Ventas directas", "Comunidad/engagement", "Tráfico a web", "Educación/contenido de valor"]'::jsonb),
    (s_id, 'Objetivo secundario', 'secondary_social_goal', 'select', false, 2, '["Visibilidad/alcance", "Ventas directas", "Comunidad/engagement", "Tráfico a web", "Educación/contenido de valor", "N/A"]'::jsonb);

    -- Step 4: Estilo Visual
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Estilo Visual', 'Cómo se ve tu contenido.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Estilo visual deseado', 'visual_style', 'select', true, 1, '["Minimal/limpio", "Editorial/magazine", "Comercial/promocional", "UGC/auténtico", "Corporativo"]'::jsonb),
    (s_id, 'Paleta de colores de marca', 'brand_colors', 'text', false, 2, null);

    -- Step 5: Referencias
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Referencias', 'Cuentas que te inspiran.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Cuentas de redes que te gustan', 'account_likes', 'textarea', false, 1, null),
    (s_id, 'Cuentas que NO te gustan', 'account_dislikes', 'textarea', false, 2, null);


    -- ============================================================
    -- 6. DISEÑO COMO SERVICIO (DaaS)
    -- Applies to: Departamento de Diseño (Estándar y Full Stack)
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Diseño como Servicio (DaaS)', 'Para contratar un equipo de diseño continuo mensual.', 'daas')
    RETURNING id INTO t_id;

    -- Step 1: Tipo de Empresa
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Tipo de Empresa', 'Contexto de tu organización.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Industria', 'industry', 'text', true, 1, null),
    (s_id, 'Tamaño de la empresa', 'company_size', 'select', true, 2, '["Startup (1-10)", "Pequeña (11-50)", "Mediana (51-200)", "Grande (200+)"]'::jsonb);

    -- Step 2: Necesidades
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Necesidades', 'Qué se diseña normalmente.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué se diseña normalmente?', 'design_needs', 'multiselect', true, 1, '["Piezas de marketing", "Presentaciones", "Social media", "Web/interfaces", "Branding", "Impresos", "Packaging", "Otro"]'::jsonb),
    (s_id, 'Volumen mensual estimado (piezas/proyectos)', 'monthly_volume', 'select', true, 2, '["1-5 piezas", "5-15 piezas", "15-30 piezas", "30+ piezas"]'::jsonb);

    -- Step 3: Prioridades
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Prioridades', 'Qué es más importante.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Áreas prioritarias', 'priority_areas', 'multiselect', true, 1, '["Marca/identidad", "Marketing/ventas", "Producto/UX", "Operación/interno"]'::jsonb);

    -- Step 4: Flujo de Trabajo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Flujo de Trabajo', 'Cómo operamos.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Quién solicita diseños?', 'requester_role', 'text', true, 1, null),
    (s_id, '¿Quién aprueba?', 'approver_role', 'text', true, 2, null),
    (s_id, 'Tiempos ideales de entrega', 'ideal_turnaround', 'select', true, 3, '["24 horas", "2-3 días", "1 semana", "Flexible"]'::jsonb);


    -- ============================================================
    -- 7. CONSULTORÍA & DESARROLLO A MEDIDA
    -- Applies to: Auditoría Digital, Consultoría Estratégica, Desarrollo a Medida
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Consultoría & Desarrollo a Medida', 'Para servicios de consultoría, auditorías y desarrollos personalizados.', 'consultoria-desarrollo')
    RETURNING id INTO t_id;

    -- Step 1: Problema Central
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Problema Central', 'Qué no está funcionando.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué no está funcionando?', 'problem_description', 'textarea', true, 1, null),
    (s_id, '¿Desde cuándo?', 'problem_duration', 'select', true, 2, '["Menos de 1 mes", "1-3 meses", "3-6 meses", "Más de 6 meses", "Siempre ha sido así"]'::jsonb);

    -- Step 2: Objetivo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo', 'Qué necesitas lograr.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Objetivo principal', 'main_objective', 'multiselect', true, 1, '["Claridad/diagnóstico", "Tomar decisión", "Optimización", "Construir solución", "Capacitación"]'::jsonb);

    -- Step 3: Expectativa
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Expectativa', 'Qué esperas recibir.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué esperas recibir?', 'expected_deliverable', 'multiselect', true, 1, '["Diagnóstico/reporte", "Plan de acción", "Recomendaciones", "Producto/desarrollo", "Capacitación/workshop"]'::jsonb),
    (s_id, 'Detalles adicionales', 'additional_details', 'textarea', false, 2, null);

    -- Step 4: Alcance (para Desarrollo a Medida)
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Alcance (solo para Desarrollo)', 'Si aplica desarrollo a medida.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Idea general de lo que quieres construir', 'development_idea', 'textarea', false, 1, null),
    (s_id, 'Usuarios que lo usarán', 'target_users', 'textarea', false, 2, null),
    (s_id, 'Funciones clave/prioridades', 'key_features', 'textarea', false, 3, null),
    (s_id, 'Restricciones (tiempo, presupuesto, tecnología)', 'constraints', 'textarea', false, 4, null);

END $$;
