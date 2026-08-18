import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);
const NEXTPREMIUM_ORG = 'a3b28337-5342-495f-bdc4-fc8e3cb61942';

async function seedNextpremium() {
  console.log(`🚀 Seeding Nextpremium Catalog (Org: ${NEXTPREMIUM_ORG})...`);

  // 1. Normalize Categories
  const categoryFixes = [
    { id: '87ce6068-5fa8-4f52-89ae-28d0201a6e94', name: 'Diseño Gráfico & Multimedia', slug: 'diseno-grafico', icon: 'Palette', color: 'purple' },
    { id: 'd6e05447-1c31-4c17-8542-cf99d177a2b9', name: 'Artesanías & Hecho a Mano', slug: 'artesanias', icon: 'Sparkles', color: 'amber' },
    { id: 'e8f45169-4d93-447e-baf6-970b0205274c', name: 'Comidas Rápidas Gourmet', slug: 'comidas-rapidas', icon: 'Utensils', color: 'red' },
    { id: '64b3a238-466a-410e-8b0f-5af59af4f759', name: 'Moda & Ropa Urbana', slug: 'ropa', icon: 'Shirt', color: 'indigo' },
    { id: '9c6ebbf5-9186-4f7e-90ba-ad5a76635c55', name: 'Mascotas & Cuidado Animal', slug: 'mascotas', icon: 'Heart', color: 'green' },
    { id: '41e22873-ee72-4ea2-9716-641ea35dcc0c', name: 'Barbería & Peluquería VIP', slug: 'peluqueria', icon: 'Scissors', color: 'blue' },
    { id: '78808003-44e4-4d20-ada7-1ac37601b0d0', name: 'Electrodomésticos & Smart Home', slug: 'electrodomesticos', icon: 'Tv', color: 'cyan' },
    { id: '7e552259-eb72-4bde-9a66-6626eea7ee53', name: 'Planes Nextpremium VIP', slug: 'nextpremium', icon: 'Crown', color: 'yellow' },
    { id: '050bdb0f-e968-4c57-ba0b-a8cc1ddc5655', name: 'Pollería & Asados Criollos', slug: 'pollos', icon: 'Drumstick', color: 'orange' },
    { id: 'b5cf9626-feeb-4423-8ffd-27c3c9bf8286', name: 'Eventos & Bodas Exclusivas', slug: 'eventos', icon: 'PartyPopper', color: 'pink' },
  ];

  for (const c of categoryFixes) {
    await supabase.from('service_categories').update(c).eq('id', c.id);
  }
  console.log('✅ Nextpremium categories normalized');

  // 2. Items for Nextpremium
  const items = [
    {
      id: 'd0000001-0000-0000-0000-000000000001',
      organization_id: NEXTPREMIUM_ORG,
      category_id: '64b3a238-466a-410e-8b0f-5af59af4f759',
      category: 'Moda & Ropa Urbana',
      name: 'Camiseta Oversized Heavyweight 240 GSM',
      description: 'Camiseta corte boxy confeccionada en 100% algodón peinado de alto gramaje (240 GSM). Cuello acanalado de 3cm que no pierde su forma y estampado en serigrafía de alta densidad.',
      base_price: 89000,
      compare_at_price: 119000,
      type: 'product',
      classification: 'physical',
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1 },
        { id: 'g3', url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 2 },
      ],
      sku: 'TEE-OVERSIZED-01',
      has_variants: true,
      badges: ['Destacado', 'Descuento'],
      specifications: {
        features: ['100% Algodón Peinado 240 GSM', 'Corte Oversized Drop-Shoulder', 'Estampado tacto cero de alta durabilidad', 'Fabricado éticamente en Colombia'],
      },
      is_visible_in_portal: true,
      is_active: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000002',
      organization_id: NEXTPREMIUM_ORG,
      category_id: '78808003-44e4-4d20-ada7-1ac37601b0d0',
      category: 'Electrodomésticos & Smart Home',
      name: 'Cafetera Espresso Automática Barista Touch 15 Bar',
      description: 'Cafetera espresso con bomba italiana de 15 bares, molinillo cónico integrado de acero inoxidable, control térmico PID y lanceta de vapor profesional para microespuma sedosa.',
      base_price: 1450000,
      compare_at_price: 1890000,
      type: 'product',
      classification: 'physical',
      image_url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1 },
      ],
      sku: 'COFFEE-ESPR-PRO',
      has_variants: false,
      badges: ['Novedad'],
      specifications: {
        features: ['Bomba de 15 Bares de presión constante', 'Molinillo con 30 niveles de molienda', 'Pantalla táctil intuitiva', 'Garantía 2 años'],
      },
      is_visible_in_portal: true,
      is_active: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000003',
      organization_id: NEXTPREMIUM_ORG,
      category_id: 'e8f45169-4d93-447e-baf6-970b0205274c',
      category: 'Comidas Rápidas Gourmet',
      name: 'Combo Burger Artesanal Black Angus + Papas Rústicas',
      description: '180g de carne de res Black Angus madurada, queso cheddar fundido, tocineta ahumada caramelizada en maple, cebolla crispy y salsa de la casa en pan brioche sellado en mantequilla.',
      base_price: 34900,
      compare_at_price: 42000,
      type: 'product',
      classification: 'physical',
      image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
        { id: 'g2', url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1 },
      ],
      sku: 'BURGER-ANGUS-COMBO',
      has_variants: true,
      badges: ['Destacado'],
      specifications: {
        features: ['Carne 100% Black Angus Certified', 'Pan Brioche horneado diario', 'Papas rústicas con paprika y romero'],
      },
      is_visible_in_portal: true,
      is_active: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000004',
      organization_id: NEXTPREMIUM_ORG,
      category_id: '7e552259-eb72-4bde-9a66-6626eea7ee53',
      category: 'Planes Nextpremium VIP',
      name: 'Membresía Nextpremium All-Access Anual',
      description: 'Acceso ilimitado a todas las herramientas premium, soporte prioritario 24/7, descuentos del 25% en todo el catálogo de productos y eventos exclusivos para miembros fundadores.',
      base_price: 499000,
      compare_at_price: 699000,
      type: 'recurring',
      frequency: 'yearly',
      classification: 'subscription',
      image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'g1', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
      ],
      sku: 'NEXT-VIP-ANNUAL',
      has_variants: false,
      badges: ['Destacado', 'Pocas Unidades'],
      is_visible_in_portal: true,
      is_active: true,
    },
  ];

  for (const it of items) {
    const { has_variants, specifications, ...base } = it;
    await supabase.from('service_catalog').upsert({
      ...base,
      has_variants: !!has_variants,
      specifications: specifications || {},
      metadata: {
        gallery_images: it.gallery_images,
        badges: it.badges,
        specifications: specifications || {},
      },
    });
    console.log(` ✅ Nextpremium item saved: "${it.name}"`);
  }

  // Theme config for Nextpremium
  await supabase.from('organization_settings').upsert({
    organization_id: NEXTPREMIUM_ORG,
    portal_theme_config: {
      theme: 'dark_luxe',
      primary_color: '#F59E0B',
      secondary_color: '#EC4899',
      accent_color: '#10B981',
      color_mode: 'dark',
      background_style: 'mesh_3d',
      hero: {
        enabled: true,
        badge_text: '👑 Nextpremium Marketplace',
        title: 'Colecciones Exclusivas & Servicios VIP',
        subtitle: 'Calidad superior, marcas seleccionadas y entregas express a todo el país.',
        cta_text: 'Ver Catálogo',
        cta_url: '#catalog',
        bg_gradient: 'from-amber-900 via-zinc-900 to-black',
      },
      navigation_style: 'pills',
      card_layout: 'grid',
      enable_search: true,
      enable_whatsapp_checkout: true,
      enable_quote_request: true,
      enable_qr_code: true,
    },
    portal_primary_color: '#F59E0B',
    portal_secondary_color: '#EC4899',
  });
  console.log('✅ Nextpremium theme customizer configured');
}

seedNextpremium().catch(err => {
  console.error('Error seeding Nextpremium:', err);
  process.exit(1);
});
