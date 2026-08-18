import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function testItemFormFlow() {
  console.log('🧪 PROBANDO FLUJO DE GUARDADO Y EDICIÓN EXACTO DEL FORMULARIO...');

  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
  const orgId = orgs![0].id;

  // 1. Simular guardar desde el formulario de edición (como el de la captura)
  // Primero creamos el item
  const { data: item, error: err1 } = await supabase
    .from('service_catalog')
    .insert({
      organization_id: orgId,
      name: 'Desarrollo a Medida Test',
      category: 'Desarrollo',
      base_price: 2500000,
      type: 'one_off',
      classification: 'service',
      inventory_quantity: 50,
      track_inventory: true,
      allow_backorders: false,
      low_stock_threshold: 5,
      sku: 'PIX-PROD-001',
      barcode: '77000000000',
    })
    .select()
    .single();

  if (err1) throw err1;
  console.log(`✅ Item creado para prueba: ${item.id}`);

  // 2. Simular payload EXACTO que envía catalog-item-form-sheet al hacer click en "Guardar"
  const formPayload: any = {
    name: 'Desarrollo a Medida Test',
    description: 'Descripción actualizada',
    category: 'Desarrollo',
    base_price: 2500000,
    compare_at_price: null,
    classification: 'service',
    type: 'one_off',
    frequency: null,
    image_url: null,
    gallery_images: [],
    video_url: null,
    sku: 'PIX-PROD-001',
    barcode: '77000000000',
    inventory_quantity: 50,
    track_inventory: true,
    allow_backorders: false,
    low_stock_threshold: 5,
    has_variants: false,
    variants: [],
    badges: [],
    is_visible_in_portal: true,
    cta_type: 'whatsapp',
    price_label_type: 'price',
    seo_title: null,
    seo_description: null,
    seo_metadata: {
      meta_title: 'Desarrollo a Medida Test',
      meta_description: 'Descripción actualizada',
      search_tags: [],
      og_image_url: null,
    },
    service_details: {
      pricing_model: 'fixed',
      duration_minutes: 60,
      deliverables: [],
      sla_hours: 24,
      location_type: 'remote',
    },
  };

  // 3. Simular la ejecución de updateCatalogItemAction
  const updatePayload: any = {
    metadata: {
      cta_type: formPayload.cta_type,
      price_label_type: formPayload.price_label_type,
    },
    image_url: formPayload.image_url,
  };

  if (formPayload.name !== undefined) updatePayload.name = formPayload.name;
  if (formPayload.description !== undefined) updatePayload.description = formPayload.description;
  if (formPayload.category !== undefined) updatePayload.category = formPayload.category;
  if (formPayload.base_price !== undefined) updatePayload.base_price = formPayload.base_price;
  if (formPayload.compare_at_price !== undefined) updatePayload.compare_at_price = formPayload.compare_at_price;
  if (formPayload.type !== undefined) updatePayload.type = formPayload.type;
  if (formPayload.classification !== undefined) updatePayload.classification = formPayload.classification;
  if (formPayload.frequency !== undefined) updatePayload.frequency = formPayload.frequency;
  if (formPayload.gallery_images !== undefined) updatePayload.gallery_images = formPayload.gallery_images;
  if (formPayload.video_url !== undefined) updatePayload.video_url = formPayload.video_url;
  if (formPayload.sku !== undefined) updatePayload.sku = formPayload.sku;
  if (formPayload.barcode !== undefined) updatePayload.barcode = formPayload.barcode;
  if (formPayload.inventory_quantity !== undefined) updatePayload.inventory_quantity = formPayload.inventory_quantity;
  if (formPayload.track_inventory !== undefined) updatePayload.track_inventory = formPayload.track_inventory;
  if (formPayload.allow_backorders !== undefined) updatePayload.allow_backorders = formPayload.allow_backorders;
  if (formPayload.low_stock_threshold !== undefined) updatePayload.low_stock_threshold = formPayload.low_stock_threshold;
  if (formPayload.has_variants !== undefined) updatePayload.has_variants = formPayload.has_variants;
  if (formPayload.variants !== undefined) updatePayload.variants = formPayload.variants;
  if (formPayload.badges !== undefined) updatePayload.badges = formPayload.badges;
  if (formPayload.seo_title !== undefined) updatePayload.seo_title = formPayload.seo_title;
  if (formPayload.seo_description !== undefined) updatePayload.seo_description = formPayload.seo_description;
  if (formPayload.seo_metadata !== undefined) updatePayload.seo_metadata = formPayload.seo_metadata;
  if (formPayload.service_details !== undefined) {
    updatePayload.service_details = formPayload.service_details;
    updatePayload.classification_metadata = { service: formPayload.service_details };
  }
  if (formPayload.is_visible_in_portal !== undefined) updatePayload.is_visible_in_portal = formPayload.is_visible_in_portal;

  const { data: updated, error: updateErr } = await supabase
    .from('service_catalog')
    .update(updatePayload)
    .eq('id', item.id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (updateErr) {
    console.error('❌ ERROR AL GUARDAR MODAL:', updateErr);
    process.exit(1);
  }

  console.log(`✅ ¡GUARDADO EXITOSO SIN ERRORES!`);
  console.log(`   ID: ${updated.id}`);
  console.log(`   Nombre: ${updated.name}`);
  console.log(`   Stock: ${updated.inventory_quantity}`);
  console.log(`   SKU: ${updated.sku}`);
  console.log(`   Barcode: ${updated.barcode}`);
  console.log(`   Track Inventory: ${updated.track_inventory}`);

  // Limpieza
  await supabase.from('service_catalog').delete().eq('id', item.id);
  console.log('✅ Limpieza completada exitosamente.');
}

testItemFormFlow().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
