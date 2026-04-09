-- Seed Service Catalog Data (Full List)

TRUNCATE TABLE public.service_catalog; -- Clear existing to avoid duplicates mixing with new structure

INSERT INTO public.service_catalog (category, name, description, type, frequency, base_price, is_visible_in_portal)
VALUES 
    -- 1️⃣ INFRAESTRUCTURA & SUSCRIPCIONES
    ('Infraestructura & Suscripciones', 'Hosting Web Profesional Anual', 'Infraestructura optimizada, monitoreo básico y soporte.', 'recurring', 'yearly', 210000, true),
    ('Infraestructura & Suscripciones', 'Hosting Premium Administrado', 'Alto rendimiento, backups avanzados, soporte prioritario.', 'recurring', 'yearly', 380000, true),
    ('Infraestructura & Suscripciones', 'Mantenimiento Web Continuo', 'Actualizaciones, seguridad y estabilidad.', 'recurring', 'monthly', 180000, true),
    ('Infraestructura & Suscripciones', 'CRM Empresarial (Suscripción)', 'Gestión de clientes, procesos y seguimiento.', 'recurring', 'monthly', 388000, true),
    ('Infraestructura & Suscripciones', 'Portal de Cliente White-label', 'Acceso privado, facturación y seguimiento.', 'recurring', 'monthly', 220000, true),

    -- 2️⃣ BRANDING & IDENTIDAD
    ('Branding & Identidad', 'Brand Manual Pro', 'Manual completo de identidad, logos multiformato, usos y aplicaciones.', 'one_off', null, 599900, true),
    ('Branding & Identidad', 'Short Guide Mark (SGM)', 'Mini manual esencial para implementación rápida.', 'one_off', null, 320000, true),
    ('Branding & Identidad', 'Brand System Advanced', 'Identidad escalable, lineamientos digitales y visuales.', 'one_off', null, 1200000, true),
    ('Branding & Identidad', 'Rebranding Estratégico', 'Redefinición visual y conceptual de marca.', 'one_off', null, 1800000, true),

    -- 3️⃣ UX / UI & PRODUCTO DIGITAL
    ('UX / UI & Producto Digital', 'UX/UI Design por Hora', 'Diseño de interfaces centradas en experiencia y conversión.', 'one_off', null, 65000, true),
    ('UX / UI & Producto Digital', 'UX Research Sprint', 'Análisis, validación y definición de producto.', 'one_off', null, 1400000, true),
    ('UX / UI & Producto Digital', 'UI System & Design Kit', 'Componentes, estilos y escalabilidad visual.', 'one_off', null, 980000, true),
    ('UX / UI & Producto Digital', 'Vibe Coding / Prototipado Avanzado (Hora)', 'Exploración visual y conceptual de alto nivel.', 'one_off', null, 120000, true),

    -- 4️⃣ WEB & ECOMMERCE
    ('Web & Ecommerce', 'Web Corporativa Profesional', 'Diseño y estructura para presencia sólida.', 'one_off', null, 1500000, true),
    ('Web & Ecommerce', 'Web Estratégica de Conversión', 'Pensada para captar leads y ventas.', 'one_off', null, 2300000, true),
    ('Web & Ecommerce', 'Ecommerce Base', 'Tienda funcional, pasarela de pagos y catálogo.', 'one_off', null, 2800000, true),
    ('Web & Ecommerce', 'Ecommerce Avanzado', 'Automatizaciones, integraciones y escalabilidad.', 'one_off', null, 4500000, true),

    -- 5️⃣ MARKETING & GROWTH
    ('Marketing & Growth', 'Marketing Digital Estratégico', 'Plan integral alineado a objetivos reales.', 'recurring', 'monthly', 1500000, true),
    ('Marketing & Growth', 'Marketing + Meta Ads Personalizado', 'Gestión, optimización y escalado.', 'recurring', 'monthly', 1800000, true),
    ('Marketing & Growth', 'Growth Sprint', 'Optimización rápida para resultados medibles.', 'one_off', null, 1200000, true),

    -- 6️⃣ SOCIAL MEDIA & CONTENIDO
    ('Social Media & Contenido', 'Social Media Plan Basic', 'Presencia constante y orden visual.', 'recurring', 'monthly', 599000, true),
    ('Social Media & Contenido', 'Social Media Plan Standard', 'Contenido estratégico y gestión activa.', 'recurring', 'monthly', 799000, true),
    ('Social Media & Contenido', 'Social Media Plan Premium', 'Estrategia avanzada, análisis y optimización.', 'recurring', 'monthly', 999900, true),
    ('Social Media & Contenido', 'Content Production Pro', 'Diseño y producción de piezas premium.', 'recurring', 'monthly', 1200000, true),

    -- 7️⃣ DISEÑO COMO SERVICIO (DaaS)
    ('Diseño como Servicio (DaaS)', 'Departamento de Diseño Estándar', 'Soporte creativo continuo.', 'recurring', 'monthly', 2500000, true),
    ('Diseño como Servicio (DaaS)', 'Departamento de Diseño Full Stack', 'Diseño, branding, digital y soporte completo.', 'recurring', 'monthly', 3500000, true),

    -- 8️⃣ CONSULTORÍA & ESPECIALIDADES
    ('Consultoría & Especialidades', 'Auditoría Digital Integral', 'Diagnóstico de marca, web y marketing.', 'one_off', null, 950000, true),
    ('Consultoría & Especialidades', 'Consultoría Estratégica', 'Sesiones de análisis y definición.', 'one_off', null, 650000, true),

    -- 9️⃣ SERVICIOS FLEXIBLES / A MEDIDA
    ('Servicios Flexibles / A Medida', 'Bolsa de Horas Creativas (10h)', 'Horas prepagadas para soporte continuo.', 'one_off', null, 600000, true),
    ('Servicios Flexibles / A Medida', 'Desarrollo a Medida', 'Servicio personalizado según requerimiento.', 'one_off', null, 0, true);
