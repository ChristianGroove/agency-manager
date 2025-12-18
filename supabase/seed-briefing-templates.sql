-- Seed Briefing Templates
-- This script inserts 6 full briefing templates with steps and fields.
-- It uses a DO block to maintain relationships via variables.

TRUNCATE TABLE briefing_templates CASCADE;

DO $$
DECLARE
    t_id UUID;
    s_id UUID;
BEGIN
    -- ============================================================
    -- 1. BRIEFING – IDENTIDAD DE MARCA
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Identidad de Marca', 'Definir los fundamentos estratégicos y visuales de una marca nueva o existente.', 'identidad-de-marca')
    RETURNING id INTO t_id;

    -- Paso 1: Contexto del negocio
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Contexto del negocio', 'Cuéntanos sobre tu empresa y su situación actual.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Nombre de la marca', 'brand_name', 'text', true, 1, null),
    (s_id, '¿La marca es nueva o existente?', 'brand_status', 'select', true, 2, '["Nueva", "Existente"]'::jsonb),
    (s_id, '¿Qué problema principal resuelve tu negocio?', 'problem_solved', 'textarea', true, 3, null),
    (s_id, '¿Qué te diferencia de tu competencia directa?', 'differentiation', 'textarea', true, 4, null);

    -- Paso 2: Público objetivo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Público objetivo', 'Define a quién le estamos hablando.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Quién es tu cliente ideal?', 'ideal_client', 'textarea', true, 1, null),
    (s_id, 'País / ciudad principal', 'location', 'text', true, 2, null),
    (s_id, 'Rango de edad aproximado', 'age_range', 'select', true, 3, '["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]'::jsonb),
    (s_id, '¿Tu cliente es B2B o B2C?', 'b2b_b2c', 'select', true, 4, '["B2B (Empresas)", "B2C (Consumidor final)", "Ambos"]'::jsonb);

    -- Paso 3: Personalidad de marca
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Personalidad de marca', 'El carácter y tono de voz de tu marca.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Elige 3–5 adjetivos que describan la marca', 'adjectives', 'multiselect', true, 1, '["Moderna", "Clásica", "Divertida", "Seria", "Accesible", "Exclusiva", "Tecnológica", "Artesanal", "Minimalista", "Audaz"]'::jsonb),
    (s_id, '¿Qué emociones debe transmitir la marca?', 'emotions', 'textarea', true, 2, null),
    (s_id, 'Marcas que te inspiran', 'inspiration', 'textarea', false, 3, null),
    (s_id, 'Marcas que NO te gustan o no quieres parecer', 'anti_inspiration', 'textarea', false, 4, null);

    -- Paso 4: Dirección visual
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Dirección visual', 'Preferencias estéticas.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Tienes colores preferidos?', 'preferred_colors', 'text', false, 1, null),
    (s_id, '¿Hay colores que debamos evitar?', 'avoid_colors', 'text', false, 2, null),
    (s_id, 'Referencias visuales (links o archivos)', 'visual_refs', 'textarea', false, 3, null), -- Changed to textarea as upload might need storage setup
    (s_id, '¿Hay algún estilo que definitivamente no quieres?', 'avoid_style', 'textarea', false, 4, null);

    -- Paso 5: Alcance y entregables
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Alcance y entregables', 'Qué esperas recibir.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué necesitas exactamente?', 'deliverables', 'multiselect', true, 1, '["Logo", "Paleta de colores", "Tipografías", "Manual de marca", "Papelería", "Plantillas redes sociales"]'::jsonb),
    (s_id, '¿Tienes una fecha objetivo?', 'deadline', 'date', false, 2, null),
    (s_id, '¿Algo más que debamos saber antes de comenzar?', 'comments', 'textarea', false, 3, null);


    -- ============================================================
    -- 2. BRIEFING – SITIO WEB CORPORATIVO
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Sitio Web Corporativo', 'Definir objetivos, estructura y alcance de un sitio web institucional.', 'sitio-web-corporativo')
    RETURNING id INTO t_id;

    -- Paso 1: Objetivo del sitio
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo del sitio', 'Para qué servirá tu web.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Cuál es el objetivo principal del sitio?', 'main_goal', 'select', true, 1, '["Informativo", "Generación de Leads", "Venta Directa", "Soporte al Cliente", "Portafolio"]'::jsonb),
    (s_id, '¿Qué acción esperas que haga el usuario?', 'user_action', 'textarea', true, 2, null);

    -- Paso 2: Contenido
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Contenido', 'Material disponible.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Cuentas con textos?', 'has_copy', 'boolean', true, 1, null),
    (s_id, '¿Cuentas con imágenes/fotos?', 'has_images', 'boolean', true, 2, null),
    (s_id, 'Idiomas del sitio', 'languages', 'multiselect', true, 3, '["Español", "Inglés", "Portugués", "Otro"]'::jsonb);

    -- Paso 3: Estructura del sitio
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Estructura del sitio', 'Mapa de navegación.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué páginas debe tener el sitio?', 'pages', 'multiselect', true, 1, '["Inicio", "Nosotros", "Servicios", "Blog", "Contacto", "Portafolio", "Testimonios", "FAQ"]'::jsonb),
    (s_id, 'Sitios web de referencia', 'references', 'textarea', false, 2, null);

    -- Paso 4: Diseño y estilo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Diseño y estilo', 'Look & Feel.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué estilo visual buscas?', 'visual_style', 'select', true, 1, '["Minimalista", "Corporativo", "Creativo/Artístico", "Tecnológico", "Lujoso"]'::jsonb),
    (s_id, '¿Qué cosas no te gustan de otros sitios?', 'dislikes', 'textarea', false, 2, null);

    -- Paso 5: Técnica
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Técnica', 'Requerimientos técnicos.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Ya tienes dominio?', 'has_domain', 'boolean', true, 1, null),
    (s_id, '¿Ya tienes hosting?', 'has_hosting', 'boolean', true, 2, null),
    (s_id, 'Integraciones necesarias', 'integrations', 'multiselect', false, 3, '["Formularios", "WhatsApp", "Pasarela de Pagos", "CRM", "Newsletter", "Chatbot"]'::jsonb);


    -- ============================================================
    -- 3. BRIEFING – ECOMMERCE
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('E-commerce', 'Definir estructura, operación y requerimientos de una tienda online.', 'ecommerce')
    RETURNING id INTO t_id;

    -- Paso 1: Negocio
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Negocio', 'Qué vas a vender.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué tipo de productos vendes?', 'product_type', 'textarea', true, 1, null),
    (s_id, 'País o países donde venderás', 'countries', 'multiselect', true, 2, '["Colombia", "Estados Unidos", "México", "Global", "Otro"]'::jsonb),
    (s_id, '¿Productos físicos o digitales?', 'physical_digital', 'select', true, 3, '["Físicos", "Digitales", "Servicios", "Mixto"]'::jsonb);

    -- Paso 2: Catálogo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Catálogo', 'Volumen y variedad.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Cantidad aproximada de productos', 'product_count', 'select', true, 1, '["1-10", "11-50", "51-100", "100-500", "500+"]'::jsonb),
    (s_id, '¿Hay variantes (talla, color)?', 'has_variants', 'boolean', true, 2, null),
    (s_id, '¿Los productos se gestionan con stock?', 'has_stock', 'boolean', true, 3, null);

    -- Paso 3: Pagos y envíos
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Pagos y envíos', 'Logística y transacciones.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Métodos de pago requeridos', 'payment_methods', 'multiselect', true, 1, '["Wompi", "MercadoPago", "PayPal", "Stripe", "Transferencia", "Contraentrega"]'::jsonb),
    (s_id, 'Métodos de envío', 'shipping_methods', 'multiselect', true, 2, '["Coordinadora", "Servientrega", "FedEx/DHL", "Domicilio propio", "Recogida en tienda"]'::jsonb),
    (s_id, '¿Requiere impuestos o facturación electrónica?', 'taxes', 'boolean', true, 3, null);

    -- Paso 4: Referencias
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Referencias', 'Inspiración.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Tiendas online que te gustan', 'store_refs', 'textarea', false, 1, null),
    (s_id, 'Funciones clave que esperas', 'key_features', 'textarea', false, 2, null);

    -- Paso 5: Operación
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Operación', 'Gestión diaria.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Quién administrará la tienda?', 'admin_role', 'select', true, 1, '["Cliente (In-house)", "Agencia (Nosotros)", "Mixto"]'::jsonb),
    (s_id, 'Fecha objetivo de lanzamiento', 'launch_date', 'date', false, 2, null);


    -- ============================================================
    -- 4. BRIEFING – LANDING PAGE
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Landing Page', 'Definir una landing enfocada en conversión.', 'landing-page')
    RETURNING id INTO t_id;

    -- Paso 1: Objetivo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo', 'Meta de conversión.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué debe lograr esta landing?', 'landing_goal', 'select', true, 1, '["Captar Leads (Datos)", "Venta Directa", "Descarga de App/Ebook", "Registro a Evento"]'::jsonb),
    (s_id, '¿Qué conversión esperas?', 'conversion_type', 'select', true, 2, '["Formulario", "Click a WhatsApp", "Compra", "Llamada"]'::jsonb);

    -- Paso 2: Público
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Público', 'Audiencia y tráfico.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿A quién va dirigida?', 'target_audience', 'textarea', true, 1, null),
    (s_id, '¿Desde dónde llegará el tráfico?', 'traffic_source', 'multiselect', true, 2, '["Facebook/Instagram Ads", "Google Ads", "Email Marketing", "Redes Sociales (Orgánico)", "QR/Offline"]'::jsonb);

    -- Paso 3: Mensaje
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Mensaje', 'Copywriting.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Propuesta de valor principal', 'value_prop', 'textarea', true, 1, null),
    (s_id, 'Beneficios clave', 'benefits', 'textarea', true, 2, null),
    (s_id, 'Objeciones comunes del cliente', 'objections', 'textarea', false, 3, null);

    -- Paso 4: Diseño
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Diseño', 'Estilo visual.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Estilo deseado', 'style', 'select', true, 1, '["Limpio y directo", "Llamativo y urgente", "Corporativo", "Storytelling"]'::jsonb),
    (s_id, 'Landings de referencia', 'refs', 'textarea', false, 2, null);

    -- Paso 5: Técnica
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Técnica', 'Integraciones.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Integraciones necesarias', 'integrations', 'multiselect', false, 1, '["CRM", "WhatsApp", "Formularios", "Pasarela de Pagos", "Pixel de Facebook/Google"]'::jsonb);


    -- ============================================================
    -- 5. BRIEFING – MARKETING / ADS
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Marketing / Ads', 'Definir estrategia de campañas pagas o marketing digital.', 'marketing-ads')
    RETURNING id INTO t_id;

    -- Paso 1: Objetivo
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo', 'Metas de la campaña.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Objetivo principal', 'campaign_goal', 'select', true, 1, '["Reconocimiento de marca", "Tráfico", "Leads/Clientes Potenciales", "Ventas", "Interacción"]'::jsonb),
    (s_id, 'KPI principal', 'kpi', 'select', true, 2, '["Costo por Lead (CPL)", "ROAS", "Costo por Click (CPC)", "Alcance"]'::jsonb);

    -- Paso 2: Público
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Público', 'Segmentación.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Segmento ideal', 'segment', 'textarea', true, 1, null),
    (s_id, 'Ubicación', 'location', 'multiselect', true, 2, '["Local (Ciudad)", "Nacional", "Internacional"]'::jsonb);

    -- Paso 3: Canales
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Canales', 'Plataformas.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Plataformas a utilizar', 'platforms', 'multiselect', true, 1, '["Facebook/Instagram", "Google Search", "YouTube", "LinkedIn", "TikTok"]'::jsonb),
    (s_id, '¿Ya tienes cuentas publicitarias?', 'has_ad_accounts', 'boolean', true, 2, null);

    -- Paso 4: Presupuesto
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Presupuesto', 'Inversión.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Presupuesto mensual estimado', 'budget', 'select', true, 1, '["Menos de $1M COP", "$1M - $3M COP", "$3M - $10M COP", "$10M+ COP"]'::jsonb),
    (s_id, 'Duración de la campaña', 'duration', 'select', true, 2, '["1 mes", "3 meses", "6 meses", "Indefinido"]'::jsonb);

    -- Paso 5: Historial
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Historial', 'Experiencia previa.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Has hecho campañas antes?', 'history', 'boolean', true, 1, null),
    (s_id, '¿Qué funcionó y qué no?', 'learnings', 'textarea', false, 2, null);


    -- ============================================================
    -- 6. BRIEFING – REDISEÑO DE SITIO EXISTENTE
    -- ============================================================
    INSERT INTO briefing_templates (name, description, slug)
    VALUES ('Rediseño Web', 'Mejorar un sitio actual sin partir desde cero.', 'rediseno-web')
    RETURNING id INTO t_id;

    -- Paso 1: Sitio actual
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Sitio actual', 'Diagnóstico.', 1)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'URL del sitio actual', 'current_url', 'text', true, 1, null),
    (s_id, '¿Qué problemas tiene el sitio hoy?', 'current_problems', 'textarea', true, 2, null);

    -- Paso 2: Objetivo del rediseño
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Objetivo del rediseño', 'Metas.', 2)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Qué quieres mejorar principalmente?', 'redesign_goals', 'multiselect', true, 1, '["Estética/Diseño", "Velocidad", "Conversión/Ventas", "Facilidad de administración", "SEO"]'::jsonb),
    (s_id, '¿Qué debe mantenerse sí o sí?', 'must_keep', 'textarea', true, 2, null);

    -- Paso 3: Contenido
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Contenido', 'Recursos.', 3)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Se reutiliza el contenido actual?', 'reuse_content', 'boolean', true, 1, null),
    (s_id, '¿Se crearán textos nuevos?', 'new_content', 'boolean', true, 2, null);

    -- Paso 4: Diseño
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Diseño', 'Nueva imagen.', 4)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, 'Sitios de referencia', 'refs', 'textarea', false, 1, null),
    (s_id, 'Cambios visuales esperados', 'visual_changes', 'textarea', false, 2, null);

    -- Paso 5: Técnica
    INSERT INTO briefing_steps (template_id, title, description, order_index)
    VALUES (t_id, 'Técnica', 'Infraestructura.', 5)
    RETURNING id INTO s_id;

    INSERT INTO briefing_fields (step_id, label, name, type, required, order_index, options) VALUES
    (s_id, '¿Hay integraciones actuales (CRM, etc.)?', 'current_integrations', 'textarea', false, 1, null),
    (s_id, 'Fecha objetivo', 'deadline', 'date', false, 2, null);

END $$;
