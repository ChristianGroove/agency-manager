import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);
const ORG_ID = 'db9d1288-80ab-48df-b130-a0739881c6f2'; // Pixy Agency

const CATEGORY_MAP: Record<string, string> = {
  'Infraestructura & Suscripciones': '07e3ea36-4cf0-4222-a1e2-b4434ea0b02c',
  'Branding & Identidad': 'bb2f0c15-9265-49af-b736-6e01327074bf',
  'UX / UI & Producto Digital': 'a16370e3-9225-4d70-a538-49161870b779',
  'Web & Ecommerce': 'ef777304-e7b4-423f-b89f-617c2ff33c1b',
  'Marketing & Growth': 'dbf7cda7-10df-4641-8129-46ddc86e0cc9',
  'Social Media & Contenido': '633455c8-439a-404e-b544-ab73f8ae5d8d',
  'Diseño como Servicio (DaaS)': '545f5160-110d-40d2-81f3-a6e5bb12a436',
  'Dise??o como Servicio (DaaS)': '545f5160-110d-40d2-81f3-a6e5bb12a436',
  'Consultoría & Especialidades': '1c946993-e260-4c42-a81e-3edc1f90509a',
  'Consultor??a & Especialidades': '1c946993-e260-4c42-a81e-3edc1f90509a',
  'Servicios Flexibles / A Medida': 'b15aadd6-a168-4870-b7ea-e80980518e02',
};

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80',
];

function cleanEncoding(str: string): string {
  if (!str) return str;
  return str
    .replace(/Suscripci\?\?n/g, 'Suscripción')
    .replace(/Estrat\?\?gico/g, 'Estratégico')
    .replace(/Estrat\?\?gica/g, 'Estratégica')
    .replace(/Conversi\?\?n/g, 'Conversión')
    .replace(/Dise\?\?o/g, 'Diseño')
    .replace(/Est\?\?ndar/g, 'Estándar')
    .replace(/Auditor\?\?a/g, 'Auditoría')
    .replace(/Consultor\?\?a/g, 'Consultoría')
    .replace(/\?\?/g, 'ó');
}

async function main() {
  console.log('🧹 Cleaning up and normalizing all items for Pixy Agency...');

  const { data: items } = await supabase
    .from('service_catalog')
    .select('*')
    .eq('organization_id', ORG_ID);

  for (let idx = 0; idx < (items || []).length; idx++) {
    const item = items![idx];
    const cleanedName = cleanEncoding(item.name);
    const cleanedCategory = cleanEncoding(item.category);
    const targetCatId = item.category_id || CATEGORY_MAP[cleanedCategory] || CATEGORY_MAP[item.category];

    const existingGallery = item.gallery_images || item.metadata?.gallery_images || [];
    const imageUrl = item.image_url || SAMPLE_IMAGES[idx % SAMPLE_IMAGES.length];
    const gallery = existingGallery.length > 0 ? existingGallery : [
      { id: `img-1-${item.id}`, url: imageUrl, is_cover: true, order_index: 0 },
      { id: `img-2-${item.id}`, url: SAMPLE_IMAGES[(idx + 1) % SAMPLE_IMAGES.length], is_cover: false, order_index: 1 },
      { id: `img-3-${item.id}`, url: SAMPLE_IMAGES[(idx + 2) % SAMPLE_IMAGES.length], is_cover: false, order_index: 2 },
    ];

    const badges = item.badges || item.metadata?.badges || (idx % 3 === 0 ? ['Destacado'] : idx % 3 === 1 ? ['Novedad'] : ['Descuento']);

    await supabase
      .from('service_catalog')
      .update({
        name: cleanedName,
        category: cleanedCategory,
        category_id: targetCatId,
        image_url: imageUrl,
        gallery_images: gallery,
        badges,
        is_visible_in_portal: true,
        is_active: true,
        metadata: {
          ...(item.metadata || {}),
          gallery_images: gallery,
          badges,
          cta_type: item.metadata?.cta_type || 'whatsapp',
          price_label_type: item.type === 'recurring' ? 'subscription' : 'price',
        },
      })
      .eq('id', item.id);

    console.log(`✅ Normalized: "${cleanedName}" -> Category: "${cleanedCategory}" (${targetCatId})`);
  }

  console.log('🎉 All items normalized and enriched successfully!');
}

main();
