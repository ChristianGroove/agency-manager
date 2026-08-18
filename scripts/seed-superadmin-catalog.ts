import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

const ORG_ID = 'db9d1288-80ab-48df-b130-a0739881c6f2'; // Pixy Agency (SuperAdmin Org)

async function seed() {
  console.log(`🚀 Starting Full Catalog Population for SuperAdmin Org: ${ORG_ID}`);

  // 1. Clean up & normalize existing category names (fixing bad encoding)
  const categoryFixes: Record<string, { name: string; slug: string; icon: string; color: string }> = {
    '07e3ea36-4cf0-4222-a1e2-b4434ea0b02c': { name: 'Infraestructura & Suscripciones', slug: 'infraestructura-suscripciones', icon: 'Server', color: 'blue' },
    'bb2f0c15-9265-49af-b736-6e01327074bf': { name: 'Branding & Identidad', slug: 'branding-identidad', icon: 'Palette', color: 'purple' },
    'a16370e3-9225-4d70-a538-49161870b779': { name: 'UX / UI & Producto Digital', slug: 'ux-ui-producto-digital', icon: 'Monitor', color: 'pink' },
    'ef777304-e7b4-423f-b89f-617c2ff33c1b': { name: 'Web & Ecommerce', slug: 'web-ecommerce', icon: 'Globe', color: 'indigo' },
    'dbf7cda7-10df-4641-8129-46ddc86e0cc9': { name: 'Marketing & Growth', slug: 'marketing-growth', icon: 'TrendingUp', color: 'green' },
    '633455c8-439a-404e-b544-ab73f8ae5d8d': { name: 'Social Media & Contenido', slug: 'social-media-contenido', icon: 'MessageCircle', color: 'orange' },
    '545f5160-110d-40d2-81f3-a6e5bb12a436': { name: 'Diseño como Servicio (DaaS)', slug: 'diseno-como-servicio', icon: 'Briefcase', color: 'cyan' },
    '1c946993-e260-4c42-a81e-3edc1f90509a': { name: 'Consultoría & Especialidades', slug: 'consultoria-especialidades', icon: 'Lightbulb', color: 'amber' },
    'b15aadd6-a168-4870-b7ea-e80980518e02': { name: 'Servicios Flexibles / A Medida', slug: 'servicios-flexibles', icon: 'Puzzle', color: 'gray' },
  };

  for (const [id, data] of Object.entries(categoryFixes)) {
    await supabase.from('service_categories').update(data).eq('id', id);
  }
  console.log('✅ Categories encoding and metadata normalized');

  // 2. Reusable Attribute Groups
  console.log('📦 Creating Reusable Attribute Groups...');
  const attributesToUpsert = [
    {
      id: 'a0000001-0000-0000-0000-000000000001',
      organization_id: ORG_ID,
      name: 'Plan y Capacidad',
      slug: 'plan-capacidad',
      display_type: 'pill',
      type: 'pill',
      options: [
        { id: 'opt-plan-starter', label: 'Starter', value: 'starter', price_modifier: 0, order_index: 0 },
        { id: 'opt-plan-pro', label: 'Professional', value: 'professional', price_modifier: 350000, order_index: 1 },
        { id: 'opt-plan-enterprise', label: 'Enterprise VIP', value: 'enterprise', price_modifier: 950000, order_index: 2 },
      ],
      order_index: 0,
      is_active: true,
    },
    {
      id: 'a0000001-0000-0000-0000-000000000002',
      organization_id: ORG_ID,
      name: 'Nivel de Licencia',
      slug: 'nivel-licencia',
      display_type: 'pill',
      type: 'pill',
      options: [
        { id: 'opt-lic-single', label: '1 Marca / Proyecto', value: 'single', price_modifier: 0, order_index: 0 },
        { id: 'opt-lic-agency', label: 'Agencia (Hasta 5 Proyectos)', value: 'agency', price_modifier: 450000, order_index: 1 },
        { id: 'opt-lic-unlimited', label: 'Ilimitada & Reventa', value: 'unlimited', price_modifier: 1200000, order_index: 2 },
      ],
      order_index: 1,
      is_active: true,
    },
    {
      id: 'a0000001-0000-0000-0000-000000000003',
      organization_id: ORG_ID,
      name: 'Color / Tema de Marca',
      slug: 'color-marca',
      display_type: 'color',
      type: 'color',
      options: [
        { id: 'opt-col-indigo', label: 'Electric Indigo', value: 'indigo', swatch_value: '#4F46E5', hex_color: '#4F46E5', swatch_type: 'color', price_modifier: 0, order_index: 0 },
        { id: 'opt-col-dark', label: 'Midnight Obsidian', value: 'obsidian', swatch_value: '#18181B', hex_color: '#18181B', swatch_type: 'color', price_modifier: 0, order_index: 1 },
        { id: 'opt-col-rose', label: 'Sunset Rose', value: 'rose', swatch_value: '#F43F5E', hex_color: '#F43F5E', swatch_type: 'color', price_modifier: 0, order_index: 2 },
        { id: 'opt-col-emerald', label: 'Emerald Luxe', value: 'emerald', swatch_value: '#10B981', hex_color: '#10B981', swatch_type: 'color', price_modifier: 0, order_index: 3 },
      ],
      order_index: 2,
      is_active: true,
    },
  ];

  for (const attr of attributesToUpsert) {
    await supabase.from('service_catalog_attributes').upsert(attr);
  }
  console.log('✅ Reusable attribute groups created');

  // 3. Global Add-on Groups
  console.log('🎁 Creating Global Add-ons & Upsells...');
  const addonsToUpsert = [
    {
      id: 'b0000001-0000-0000-0000-000000000001',
      organization_id: ORG_ID,
      name: 'Servicios de Aceleración & Soporte',
      description: 'Potencia tu servicio con soporte dedicado y tiempos de entrega reducidos',
      selection_type: 'multiple',
      is_required: false,
      min_selections: 0,
      max_selections: 3,
      scope: 'global',
      options: [
        { id: 'add-opt-sla24', name: 'Entrega Prioritaria Flash 24-48h', price_delta: 250000, is_default: false },
        { id: 'add-opt-vipwa', name: 'Soporte Dedicado WhatsApp VIP 24/7 (30 días)', price_delta: 180000, is_default: false },
        { id: 'add-opt-rawsrc', name: 'Archivos Fuente Vectoriales & Código Raw', price_delta: 150000, is_default: false },
      ],
      order_index: 0,
      is_active: true,
    },
    {
      id: 'b0000001-0000-0000-0000-000000000002',
      organization_id: ORG_ID,
      name: 'Infraestructura & Protección Cloud',
      description: 'Capas de seguridad avanzada y backups automatizados',
      selection_type: 'multiple',
      is_required: false,
      min_selections: 0,
      max_selections: 2,
      scope: 'global',
      options: [
        { id: 'add-opt-waf', name: 'Cloudflare Enterprise WAF + SSL Dedicado', price_delta: 120000, is_default: false },
        { id: 'add-opt-backup', name: 'Snapshot Cloud Diario Automatizado (1 año)', price_delta: 95000, is_default: false },
      ],
      order_index: 1,
      is_active: true,
    },
  ];

  for (const add of addonsToUpsert) {
    await supabase.from('service_catalog_addons').upsert(add);
  }
  console.log('✅ Addon groups created');

  // 4. Populate Rich Catalog Items
  console.log('🛍️ Populating Rich Multi-Industry Catalog Items...');

  const items = [
    // --- 1. Web & Ecommerce ---
    {
      id: 'c0000001-0000-0000-0000-000000000001',
      organization_id: ORG_ID,
      category_id: 'ef777304-e7b4-423f-b89f-617c2ff33c1b',
      category: 'Web & Ecommerce',
      name: 'Tienda Online E-commerce Ultra-Rápida Next.js',
      description: 'Plataforma e-commerce de alto rendimiento construida sobre Next.js 15, Supabase y pasarelas integradas (Wompi, PSE, Tarjeta, Nequi). Incluye carrito interactivo, panel de inventario y optimización SEO 100/100.',
      base_price: 2800000,
      compare_at_price: 3600000,
      type: 'one_off',
      classification: 'service',
      image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Dashboard E-commerce Moderno' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Panel de Analíticas y Ventas' },
        { id: 'g3', url: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 2, title: 'Diseño Mobile First Adaptativo' },
        { id: 'g4', url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 3, title: 'Checkout y Pasarelas de Pago' },
      ],
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sku: 'WEB-ECOM-PRO-01',
      has_variants: true,
      badges: ['Destacado', 'Descuento'],
      featured_badge: 'Destacado',
      specifications: {
        features: [
          'Arquitectura Server-Side Rendered Next.js con carga menor a 0.8s',
          'Checkout seguro multi-pasarela (Wompi, Tarjeta, PSE, Nequi, Contra Entrega)',
          'Panel de gestión de productos con variantes infinitas e inventario en tiempo real',
          'Notificaciones automáticas a WhatsApp y correo por cada pedido confirmado',
          'Soporte multi-idioma y multi-moneda (COP / USD)',
        ],
        deliverables: [
          'Código fuente completo alojado en repositorio privado GitHub',
          'Despliegue automatizado en infraestructura Vercel / Cloudflare',
          'Base de datos Supabase PostgreSQL configurada con backups diarios',
          'Manual de administración y 2 sesiones de capacitación en vivo',
        ],
        sla: [
          { label: 'Tiempo de Entrega', value: '15 días hábiles' },
          { label: 'Garantía Técnica', value: '90 días de soporte correctivo incluido' },
          { label: 'Disponibilidad', value: '99.9% Uptime SLA Cloud' },
        ],
        policy: 'Revisiones ilimitadas durante la fase de prototipado UX/UI en Figma.',
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Descripción General', content: 'Una solución de comercio electrónico lista para producción diseñada para marcas que buscan máxima velocidad de carga y altas tasas de conversión.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
        { id: 'tab-2', title: 'Características Principales', content: '', type: 'bullets', items: ['Catálogo multi-categoría interactivo', 'Integración Wompi HMAC SHA-256', 'PWA (Instalable en smartphones)', 'Optimización SEO Schema.org'], key_values: {}, order_index: 1, is_enabled: true },
        { id: 'tab-3', title: 'Entregables y SLA', content: '', type: 'table', items: [], key_values: { 'Tiempo de Entrega': '15 días', 'Soporte Post-Lanzamiento': '90 días', 'Código': '100% Propietario' }, order_index: 2, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Desarrollo Tienda Online E-commerce Next.js | Pixy',
        meta_description: 'Creamos tu tienda virtual ultra rápida con pasarelas de pago y catálogo interactivo.',
        search_tags: ['ecommerce', 'tienda virtual', 'nextjs', 'wompi', 'desarrollo web'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'price' },
    },

    // --- 2. Branding & Identidad ---
    {
      id: 'c0000001-0000-0000-0000-000000000002',
      organization_id: ORG_ID,
      category_id: 'bb2f0c15-9265-49af-b736-6e01327074bf',
      category: 'Branding & Identidad',
      name: 'Sistema de Identidad de Marca & Brand Guidelines 360°',
      description: 'Construcción integral de identidad corporativa premium: imagotipo, sistema tipográfico, paleta cromática de alta fidelidad, manual de marca interactivo digital y aplicaciones en papelería y redes sociales.',
      base_price: 1200000,
      compare_at_price: 1600000,
      type: 'one_off',
      classification: 'service',
      image_url: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Manual de Marca Impreso y Digital' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Sistema Gráfico y Paletas de Color' },
        { id: 'g3', url: 'https://images.unsplash.com/photo-1542744094-3a31727221eb?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 2, title: 'Mockups Corporativos y Packaging' },
      ],
      sku: 'BRAND-SYS-360',
      has_variants: true,
      badges: ['Novedad', 'Destacado'],
      featured_badge: 'Novedad',
      specifications: {
        features: [
          '3 conceptos creativos iniciales con fundamentos semióticos',
          'Manual de identidad de marca interactivo en PDF y Figma Kit',
          'Kit de redes sociales (Avatares, Banners, Templates editables)',
          'Entregables en vector (.SVG, .AI, .EPS, .PDF) y raster alta resolución',
        ],
        deliverables: [
          'Manual de Marca PDF (40+ páginas)',
          'Archivos Vectoriales Master',
          'Firma de correo HTML y Plantillas de Presentación',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Alcance del Proyecto', content: 'Transformamos la percepción de tu negocio con una identidad visual coherente, memorable y de clase mundial.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
        { id: 'tab-2', title: 'Entregables', content: '', type: 'bullets', items: ['Logo Master en todos los formatos', 'Tipografías con licencias comerciales', 'Guía de estilo y tono de voz'], key_values: {}, order_index: 1, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Diseño de Marca y Branding Corporativo | Pixy',
        meta_description: 'Diseñamos marcas memorables con identidad visual integral y manual de estilo.',
        search_tags: ['branding', 'diseño logo', 'identidad visual', 'manual de marca'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'price' },
    },

    // --- 3. Infraestructura & Suscripciones ---
    {
      id: 'c0000001-0000-0000-0000-000000000003',
      organization_id: ORG_ID,
      category_id: '07e3ea36-4cf0-4222-a1e2-b4434ea0b02c',
      category: 'Infraestructura & Suscripciones',
      name: 'Hosting Cloud Administrado & Mantenimiento Web Continuo',
      description: 'Infraestructura en la nube de alta disponibilidad con discos NVMe, CDN global Anycast, certificados SSL automáticos, monitoreo 24/7 y actualizaciones de seguridad preventivas periódicas.',
      base_price: 180000,
      compare_at_price: 240000,
      type: 'recurring',
      frequency: 'monthly',
      classification: 'subscription',
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Centro de Datos Cloud NVMe' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Monitoreo de Red en Tiempo Real' },
      ],
      sku: 'HOST-CLOUD-SUB',
      has_variants: true,
      badges: ['Destacado'],
      featured_badge: 'Destacado',
      specifications: {
        features: [
          'Almacenamiento NVMe de ultra velocidad sin límites de ancho de banda',
          'Protección DDoS avanzada y firewall WAF integrado',
          'Copias de seguridad diarias con restauración en 1 clic',
          'Soporte técnico prioritario por WhatsApp y Tickets',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Detalles del Servicio', content: 'Tranquilidad total para tu sitio web con soporte proactivo y rendimiento garantizado.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
        { id: 'tab-2', title: 'SLA Garantizado', content: '', type: 'table', items: [], key_values: { 'Uptime': '99.95%', 'Tiempo de Respuesta': '< 30 min', 'Backups': 'Diarios' }, order_index: 1, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Hosting Cloud Administrado y Mantenimiento | Pixy',
        meta_description: 'Alojamiento web en la nube con backups diarios y soporte 24/7.',
        search_tags: ['hosting cloud', 'servidores', 'mantenimiento web', 'ssl'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'subscription' },
    },

    // --- 4. UX / UI & Producto Digital ---
    {
      id: 'c0000001-0000-0000-0000-000000000004',
      organization_id: ORG_ID,
      category_id: 'a16370e3-9225-4d70-a538-49161870b779',
      category: 'UX / UI & Producto Digital',
      name: 'Diseño UX/UI de App Móvil & SaaS (Figma Design System)',
      description: 'Diseño integral de experiencias de usuario para aplicaciones móviles (iOS / Android) y plataformas SaaS. Incluye arquitectura de información, wireframing interactivo, componentes reutilizables y prototipo navegable.',
      base_price: 1800000,
      compare_at_price: 2400000,
      type: 'one_off',
      classification: 'service',
      image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Prototipo Interactivo en Figma' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Design System & Componentes UI' },
        { id: 'g3', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 2, title: 'Flujos de Usuario y Wireframes' },
      ],
      sku: 'UXUI-SAAS-01',
      has_variants: true,
      badges: ['Novedad'],
      featured_badge: 'Novedad',
      specifications: {
        features: [
          'Design System completo con variables de color, tipografía y espaciado',
          'Hasta 15 pantallas principales con estados interactivos (Hover, Active, Error)',
          'Prototipo Figma 100% navegable listo para pruebas de usuario',
          'Documentación para desarrolladores (Tokens, Specs y Export assets)',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Metodología UX', content: 'Investigación de usuarios, benchmarking competitivo, wireframing y diseño visual en Figma.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Diseño UX/UI de Apps y SaaS | Pixy',
        meta_description: 'Diseñamos interfaces de usuario modernas e intuitivas en Figma.',
        search_tags: ['ux', 'ui', 'figma', 'design system', 'app movil'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'price' },
    },

    // --- 5. Marketing & Growth ---
    {
      id: 'c0000001-0000-0000-0000-000000000005',
      organization_id: ORG_ID,
      category_id: 'dbf7cda7-10df-4641-8129-46ddc86e0cc9',
      category: 'Marketing & Growth',
      name: 'Gestión de Campañas Meta Ads & Google Ads de Alto ROAS',
      description: 'Estrategia, configuración y optimización diaria de pauta digital en Facebook, Instagram y Google Ads orientada a generación de clientes potenciales calificados y ventas directas.',
      base_price: 1500000,
      compare_at_price: 2000000,
      type: 'recurring',
      frequency: 'monthly',
      classification: 'service',
      image_url: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Panel de Rendimiento de Campañas Ads' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Embudos de Conversión y Retargeting' },
      ],
      sku: 'ADS-GROWTH-MO',
      has_variants: true,
      badges: ['Destacado'],
      featured_badge: 'Destacado',
      specifications: {
        features: [
          'Configuración avanzada de Pixel de Meta, API de Conversiones y Google Tag Manager',
          'Creación de creativos estáticos y en video orientados a conversión directa',
          'Pruebas A/B continuas de copys, audiencias y páginas de aterrizaje',
          'Reporte quincenal con métricas clave (CPL, CPA, ROAS, Retorno de Inversión)',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Estrategia de Crecimiento', content: 'Escalamos tus ventas con embudos de atracción, nutrición y cierre.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Agencia de Pauta Digital Meta Ads y Google Ads | Pixy',
        meta_description: 'Maximizamos el retorno de tu inversión en publicidad digital.',
        search_tags: ['meta ads', 'google ads', 'pauta digital', 'growth marketing'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'subscription' },
    },

    // --- 6. Social Media & Contenido ---
    {
      id: 'c0000001-0000-0000-0000-000000000006',
      organization_id: ORG_ID,
      category_id: '633455c8-439a-404e-b544-ab73f8ae5d8d',
      category: 'Social Media & Contenido',
      name: 'Plan Mensual de Contenido Audiovisual & Reels Virales',
      description: 'Producción mensual de contenido estratégico para Instagram y TikTok: guiones persuasivos, edición profesional de Reels con subtítulos dinámicos y carruseles educativos de alto guardado.',
      base_price: 799000,
      compare_at_price: 1100000,
      type: 'recurring',
      frequency: 'monthly',
      classification: 'service',
      image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Producción de Contenido Social' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Edición de Reels y Formatos Cortos' },
      ],
      sku: 'SOC-CONTENT-PLAN',
      has_variants: true,
      badges: ['Pocas Unidades'],
      featured_badge: 'Pocas Unidades',
      specifications: {
        features: [
          '12 Reels/TikToks editados con música en tendencia y subtítulos animados',
          '4 Carruseles educativos diseñados con la identidad visual de la marca',
          'Calendario de publicaciones mensual con copies y hashtags optimizados',
          'Monitoreo semanal de rendimiento y ajuste de formatos',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Plan de Contenidos', content: 'Posiciona tu marca como referente en tu nicho con contenido constante de alta calidad.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Gestión de Redes Sociales y Creación de Contenido | Pixy',
        meta_description: 'Creamos contenido estratégico que conecta y vende en redes sociales.',
        search_tags: ['social media', 'reels', 'tiktok', 'contenido digital'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'subscription' },
    },

    // --- 7. Diseño como Servicio (DaaS) ---
    {
      id: 'c0000001-0000-0000-0000-000000000007',
      organization_id: ORG_ID,
      category_id: '545f5160-110d-40d2-81f3-a6e5bb12a436',
      category: 'Diseño como Servicio (DaaS)',
      name: 'Suscripción de Diseño Ilimitado (Design-as-a-Service)',
      description: 'Tu propio departamento de diseño senior por una tarifa plana mensual. Solicitudes ilimitadas, entregas rápidas cada 48h, una tarea activa a la vez y pausa o cancela cuando quieras.',
      base_price: 2500000,
      compare_at_price: 3200000,
      type: 'recurring',
      frequency: 'monthly',
      classification: 'subscription',
      image_url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Equipo de Diseño Dedicado' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Flujo de Trabajo Colaborativo en Trello/ClickUp' },
      ],
      sku: 'DAAS-SUB-MONTHLY',
      has_variants: true,
      badges: ['Destacado', 'Pocas Unidades'],
      featured_badge: 'Destacado',
      specifications: {
        features: [
          'Solicitudes y revisiones ilimitadas (Branding, UI/UX, Banners, Pitch Decks)',
          'Entregas promedio cada 48 horas hábiles',
          'Tablero de gestión privado en Trello / Slack dedicado',
          'Pausa o cancela tu suscripción en cualquier momento sin penalizaciones',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: '¿Cómo Funciona?', content: 'Suscríbete, agrega todas las tareas de diseño que necesites a tu tablero y recibe entregas continuas cada 48 horas.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Suscripción de Diseño Gráfico Ilimitado | Pixy DaaS',
        meta_description: 'Diseño gráfico y UI/UX ilimitado para startups y agencias.',
        search_tags: ['daas', 'diseño ilimitado', 'suscripcion diseno', 'design as a service'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'subscription' },
    },

    // --- 8. Consultoría & Especialidades ---
    {
      id: 'c0000001-0000-0000-0000-000000000008',
      organization_id: ORG_ID,
      category_id: '1c946993-e260-4c42-a81e-3edc1f90509a',
      category: 'Consultoría & Especialidades',
      name: 'Auditoría Digital 360° & Plan Estratégico de Crecimiento',
      description: 'Diagnóstico exhaustivo del ecosistema digital de tu empresa: embudos de venta, velocidad web, posicionamiento SEO, seguridad técnica y arquitectura de software con recomendaciones accionables.',
      base_price: 950000,
      compare_at_price: 1300000,
      type: 'one_off',
      classification: 'service',
      image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Auditoría y Análisis de Datos' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Sesión Estratégica 1 a 1' },
      ],
      sku: 'CONS-AUDIT-360',
      has_variants: false,
      badges: ['Novedad'],
      featured_badge: 'Novedad',
      specifications: {
        features: [
          'Auditoría técnica de Core Web Vitals, SEO On-Page y rendimiento de código',
          'Evaluación de fugas en embudos de venta y checkout',
          'Documento ejecutivo con hoja de ruta priorizada en 30, 60 y 90 días',
          'Sesión de presentación y preguntas de 90 minutos con directores de tecnología',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Alcance de la Auditoría', content: 'Identifica con precisión quirúrgica dónde estás perdiendo clientes y cómo optimizar tu inversión tecnológica.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Auditoría Digital y Consultoría Tecnológica | Pixy',
        meta_description: 'Diagnóstico integral de rendimiento web, SEO y conversión.',
        search_tags: ['auditoria web', 'consultoria digital', 'seo audit', 'optimizacion'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'price' },
    },

    // --- 9. Servicios Flexibles / A Medida ---
    {
      id: 'c0000001-0000-0000-0000-000000000009',
      organization_id: ORG_ID,
      category_id: 'b15aadd6-a168-4870-b7ea-e80980518e02',
      category: 'Servicios Flexibles / A Medida',
      name: 'Bolsa de Horas de Desarrollo & Diseño Flex (10h / 20h / 40h)',
      description: 'Paquete prepagado de horas de ingeniería de software y diseño UI/UX para ajustes puntuales, nuevas funcionalidades, integraciones API o soporte de emergencia sin contratos a largo plazo.',
      base_price: 600000,
      compare_at_price: 800000,
      type: 'one_off',
      classification: 'service',
      image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0, title: 'Bolsa de Horas de Ingeniería Flexible' },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1, title: 'Desarrollo Ágil y Soporte Continuo' },
      ],
      sku: 'HOURS-PACK-10',
      has_variants: true,
      badges: ['Descuento'],
      featured_badge: 'Descuento',
      specifications: {
        features: [
          'Horas utilizables en Frontend (React/Next.js), Backend (Node/Supabase) o Diseño Figma',
          'Reporte detallado de tiempo por cada tarea ejecutada',
          'Vigencia de 6 meses a partir de la fecha de compra',
          'Canal de comunicación directo en Slack / WhatsApp con los ingenieros',
        ],
      },
      specs_tabs: [
        { id: 'tab-1', title: 'Condiciones de la Bolsa', content: 'Flexibilidad absoluta: usa tus horas según las prioridades cambiantes de tu negocio.', type: 'text', items: [], key_values: {}, order_index: 0, is_enabled: true },
      ],
      seo_metadata: {
        meta_title: 'Bolsa de Horas de Desarrollo Web y Diseño | Pixy',
        meta_description: 'Paquetes de horas para desarrollo frontend, backend y diseño UX/UI.',
        search_tags: ['bolsa de horas', 'desarrollo a medida', 'soporte tecnico', 'freelance'],
      },
      is_visible_in_portal: true,
      is_active: true,
      metadata: { cta_type: 'whatsapp', price_label_type: 'price' },
    },
  ];

  for (const item of items) {
    const { has_variants, specs_tabs, seo_metadata, featured_badge, ...baseFields } = item;
    
    // Save to service_catalog
    const { error: upsertErr } = await supabase
      .from('service_catalog')
      .upsert({
        ...baseFields,
        metadata: {
          ...item.metadata,
          gallery_images: item.gallery_images,
          badges: item.badges,
          featured_badge,
          specifications: item.specifications,
          specs_tabs,
          seo_metadata,
        },
      });

    if (upsertErr) {
      console.error(`Error saving item ${item.name}:`, upsertErr);
    } else {
      console.log(` ✅ Item populated: "${item.name}"`);
    }

    // Link item to global addons
    for (const add of addonsToUpsert) {
      await supabase.from('service_catalog_item_addons').upsert({
        item_id: item.id,
        addon_id: add.id,
        order_index: add.order_index,
      });
    }

    // Populate Item Variants if applicable
    if (item.has_variants) {
      const variants = [
        {
          id: `${item.id.substring(0, 32)}0001`,
          organization_id: ORG_ID,
          catalog_item_id: item.id,
          title: `${item.name} - Plan Starter`,
          sku: `${item.sku}-STARTER`,
          price_modifier: 0,
          price_type: 'fixed',
          inventory_quantity: 50,
          track_inventory: false,
          attributes: { 'Plan': 'Starter' },
          is_active: true,
          order_index: 0,
        },
        {
          id: `${item.id.substring(0, 32)}0002`,
          organization_id: ORG_ID,
          catalog_item_id: item.id,
          title: `${item.name} - Plan Professional (Recomendado)`,
          sku: `${item.sku}-PRO`,
          price_modifier: 350000,
          price_type: 'offset',
          inventory_quantity: 25,
          track_inventory: false,
          attributes: { 'Plan': 'Professional' },
          is_active: true,
          order_index: 1,
        },
        {
          id: `${item.id.substring(0, 32)}0003`,
          organization_id: ORG_ID,
          catalog_item_id: item.id,
          title: `${item.name} - Plan Enterprise VIP 360`,
          sku: `${item.sku}-ENT`,
          price_modifier: 950000,
          price_type: 'offset',
          inventory_quantity: 10,
          track_inventory: false,
          attributes: { 'Plan': 'Enterprise VIP' },
          is_active: true,
          order_index: 2,
        },
      ];

      for (const v of variants) {
        await supabase.from('service_catalog_variants').upsert(v);
      }
    }
  }

  // 5. Storefront Customizer Theme Configuration
  console.log('🎨 Configuring Storefront Theme & Customizer in Organization Settings...');
  const themeConfig = {
    theme: 'modern_glass',
    primary_color: '#6366F1',
    secondary_color: '#EC4899',
    accent_color: '#10B981',
    color_mode: 'auto',
    background_style: 'mesh_3d',
    hero: {
      enabled: true,
      badge_text: '✨ Catálogo Comercial Oficial 2026',
      title: 'Soluciones Digitales de Alto Rendimiento',
      subtitle: 'Diseño UX/UI de clase mundial, desarrollo web de ultra velocidad y estrategias de growth marketing que transforman tu negocio.',
      cta_text: 'Explorar Soluciones',
      cta_url: '#catalog',
      bg_gradient: 'from-indigo-900 via-slate-900 to-black',
      bg_image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&auto=format&fit=crop&q=80',
    },
    navigation_style: 'pills',
    card_layout: 'grid',
    enable_search: true,
    enable_whatsapp_checkout: true,
    enable_quote_request: true,
    enable_qr_code: true,
    faq: [
      {
        id: 'faq-1',
        question: '¿Cómo es el proceso de contratación e inicio de un proyecto?',
        answer: 'Una vez seleccionado el servicio o paquete, generamos una cotización formal y contrato digital. Tras el pago del anticipo (vía Wompi, PSE o transferencia), agendamos la sesión de kick-off en menos de 24 horas hábiles.',
        category: 'Proceso',
      },
      {
        id: 'faq-2',
        question: '¿Qué pasarelas de pago y monedas aceptan?',
        answer: 'Aceptamos pagos en Pesos Colombianos (COP) mediante Tarjetas de Crédito, PSE, Nequi y Daviplata vía Wompi. Para clientes internacionales recibimos transferencias en USD y tarjetas globales.',
        category: 'Pagos',
      },
      {
        id: 'faq-3',
        question: '¿El código y los archivos de diseño son 100% de mi propiedad?',
        answer: 'Absolutamente sí. Al finalizar y liquidar el proyecto, transferimos los repositorios de código privados en GitHub y los archivos originales en Figma con licencia de uso comercial perpetua.',
        category: 'Propiedad Intelectual',
      },
      {
        id: 'faq-4',
        question: '¿Ofrecen garantía y soporte técnico después del lanzamiento?',
        answer: 'Todos nuestros proyectos web y de software incluyen 90 días de garantía técnica y soporte correctivo sin costo adicional, además de planes de mantenimiento continuo opcionales.',
        category: 'Garantía',
      },
      {
        id: 'faq-5',
        question: '¿Puedo solicitar una cotización a medida o servicios combinados?',
        answer: '¡Por supuesto! Utiliza el botón "Solicitar Cotización" o escríbenos directamente a WhatsApp para estructurar una propuesta modular adaptada al presupuesto y alcance de tu empresa.',
        category: 'Cotizaciones',
      },
    ],
    testimonials: [
      {
        id: 'test-1',
        name: 'Valentina Restrepo',
        role: 'CEO & Co-Founder',
        company: 'Nova Commerce',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        quote: 'La tienda virtual que desarrollaron superó todas nuestras expectativas. Nuestra tasa de conversión subió un 42% en el primer mes y la velocidad de carga es increíble.',
        rating: 5,
      },
      {
        id: 'test-2',
        name: 'Carlos Mario Vélez',
        role: 'Director de Marketing',
        company: 'Grupo Inmobiliario Nexus',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        quote: 'El sistema de identidad y las campañas de Meta Ads nos permitieron cerrar contratos de alto valor en tiempo récord. Su nivel de diseño y profesionalismo es inigualable.',
        rating: 5,
      },
      {
        id: 'test-3',
        name: 'Dra. Marcela Quintana',
        role: 'Directora Médica',
        company: 'Clínica Dermatológica Dermis',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        quote: 'La automatización de citas y el catálogo de servicios en línea simplificó por completo la operación de nuestro equipo y mejoró la experiencia de nuestros pacientes.',
        rating: 5,
      },
      {
        id: 'test-4',
        name: 'Alejandro Morales',
        role: 'Head of Engineering',
        company: 'SaaS Pulse Latam',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        quote: 'La bolsa de horas de desarrollo nos permitió acelerar nuestro roadmap 3 meses antes de lo previsto. Código limpio, estructurado y listo para producción.',
        rating: 5,
      },
    ],
    social_links: {
      whatsapp: '573001234567',
      instagram: 'https://instagram.com/pixyagency',
      facebook: 'https://facebook.com/pixyagency',
      website: 'https://pixy.agency',
    },
    business_hours: {
      lunes_viernes: '08:00 AM - 06:00 PM',
      sabado: '09:00 AM - 02:00 PM',
      domingo: 'Cerrado (Atención vía WhatsApp)',
    },
  };

  const { error: settingsErr } = await supabase
    .from('organization_settings')
    .update({
      portal_theme_config: themeConfig,
      portal_primary_color: themeConfig.primary_color,
      portal_secondary_color: themeConfig.secondary_color,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', ORG_ID);

  if (settingsErr) {
    console.error('Error updating organization settings:', settingsErr);
  } else {
    console.log('✅ Organization Settings and Theme Customizer configured successfully!');
  }

  console.log('\n🎉 ALL CATALOG ITEMS, ATTRIBUTES, VARIANTS, ADDONS & THEME CONFIGURED SUCCESSFULLY!');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
