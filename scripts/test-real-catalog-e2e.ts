import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function testRealCatalogFlows() {
  console.log('🚀 INICIANDO AUDITORÍA Y PRUEBAS REALES DE BASE DE DATOS Y ACCIONES...');

  // 1. Obtener una organización real
  const { data: orgs, error: orgError } = await supabase.from('organizations').select('id, name').limit(1);
  if (orgError || !orgs || orgs.length === 0) {
    throw new Error('No se encontró ninguna organización en la base de datos');
  }
  const orgId = orgs[0].id;
  console.log(`✅ Organización detectada: "${orgs[0].name}" (${orgId})`);

  // 2. Probar inserción directa y actualización en service_catalog con payload real
  console.log('\n--- PRUEBA 1: Creación de Producto Físico con Inventario & Specs ---');
  const testProductPayload: any = {
    organization_id: orgId,
    name: 'Producto Físico Test E2E ' + Date.now(),
    description: 'Descripción detallada de prueba con stock',
    category: 'General',
    base_price: 150000,
    compare_at_price: 180000,
    type: 'product',
    classification: 'physical',
    sku: 'SKU-TEST-001',
    barcode: '77000000001',
    inventory_quantity: 45,
    track_inventory: true,
    allow_backorders: false,
    low_stock_threshold: 5,
    is_visible_in_portal: true,
    is_active: true,
    badges: ['Novedad', 'Destacado'],
    physical_details: {
      weight_kg: 1.5,
      dimensions: { length: 20, width: 15, height: 10, unit: 'cm' },
      shipping_required: true,
    },
    seo_metadata: {
      meta_title: 'Producto Físico Test',
      meta_description: 'Meta descripción para SEO',
      search_tags: ['test', 'fisico', 'calidad'],
    },
  };

  const { data: createdProduct, error: createError } = await supabase
    .from('service_catalog')
    .insert(testProductPayload)
    .select()
    .single();

  if (createError) {
    console.error('❌ Error al crear producto en service_catalog:', createError);
    process.exit(1);
  }
  console.log(`✅ Producto creado exitosamente con ID: ${createdProduct.id}`);

  // 3. Probar actualización del producto (simulando exactamente lo que hace el formulario del modal al guardar)
  console.log('\n--- PRUEBA 2: Actualización de Producto (Inventario, Precios, SEO, Specs) ---');
  const updateProductPayload: any = {
    name: createdProduct.name + ' (Actualizado)',
    base_price: 165000,
    compare_at_price: 200000,
    inventory_quantity: 60,
    track_inventory: true,
    allow_backorders: true,
    low_stock_threshold: 8,
    sku: 'SKU-TEST-001-UPDATED',
    barcode: '77000000002',
    badges: ['Destacado', 'Oferta Especial'],
    physical_details: {
      weight_kg: 2.0,
      dimensions: { length: 25, width: 20, height: 12, unit: 'cm' },
      shipping_required: true,
    },
    metadata: {
      cta_type: 'cart',
      price_label_type: 'price',
    },
  };

  const { data: updatedProduct, error: updateError } = await supabase
    .from('service_catalog')
    .update(updateProductPayload)
    .eq('id', createdProduct.id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error al actualizar producto:', updateError);
    process.exit(1);
  }
  console.log(`✅ Producto actualizado exitosamente. Nuevo precio: $${updatedProduct.base_price}, Stock: ${updatedProduct.inventory_quantity}, SKU: ${updatedProduct.sku}`);

  // 4. Probar creación y actualización de Servicio
  console.log('\n--- PRUEBA 3: Creación y Edición de Servicio (Desarrollo / Consultoría) ---');
  const testServicePayload: any = {
    organization_id: orgId,
    name: 'Servicio de Consultoría Test ' + Date.now(),
    description: 'Servicio profesional por horas o entregable',
    category: 'Consultoría',
    base_price: 350000,
    type: 'one_off',
    classification: 'service',
    inventory_quantity: 0,
    track_inventory: false,
    allow_backorders: false,
    is_visible_in_portal: true,
    is_active: true,
    service_details: {
      pricing_model: 'fixed',
      duration_minutes: 120,
      deliverables: ['Diagnóstico', 'Estrategia', 'Reporte PDF'],
      sla_hours: 48,
      location_type: 'remote',
    },
    metadata: {
      cta_type: 'quote',
    },
  };

  const { data: createdService, error: serviceCreateError } = await supabase
    .from('service_catalog')
    .insert(testServicePayload)
    .select()
    .single();

  if (serviceCreateError) {
    console.error('❌ Error al crear servicio:', serviceCreateError);
    process.exit(1);
  }
  console.log(`✅ Servicio creado exitosamente con ID: ${createdService.id}`);

  // Actualizar servicio
  const { data: updatedService, error: serviceUpdateError } = await supabase
    .from('service_catalog')
    .update({
      base_price: 400000,
      service_details: {
        pricing_model: 'hourly',
        duration_minutes: 180,
        deliverables: ['Diagnóstico', 'Estrategia', 'Reporte PDF', 'Acompañamiento 1:1'],
        sla_hours: 24,
        location_type: 'remote',
      },
      metadata: {
        cta_type: 'whatsapp',
      },
    })
    .eq('id', createdService.id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (serviceUpdateError) {
    console.error('❌ Error al actualizar servicio:', serviceUpdateError);
    process.exit(1);
  }
  console.log(`✅ Servicio actualizado exitosamente. Nuevo precio: $${updatedService.base_price}`);

  // 5. Probar creación y actualización de Suscripción / Membresía
  console.log('\n--- PRUEBA 4: Creación y Edición de Suscripción Recurrente ---');
  const testSubPayload: any = {
    organization_id: orgId,
    name: 'Plan Mensual Pro Test ' + Date.now(),
    description: 'Membresía recurrente mensual',
    category: 'Membresías',
    base_price: 89000,
    type: 'recurring',
    classification: 'subscription',
    frequency: 'monthly',
    is_visible_in_portal: true,
    is_active: true,
    subscription_details: {
      billing_frequency: 'monthly',
      trial_days: 7,
      setup_fee: 25000,
      minimum_commitment_months: 3,
      auto_renew: true,
    },
  };

  const { data: createdSub, error: subCreateError } = await supabase
    .from('service_catalog')
    .insert(testSubPayload)
    .select()
    .single();

  if (subCreateError) {
    console.error('❌ Error al crear suscripción:', subCreateError);
    process.exit(1);
  }
  console.log(`✅ Suscripción creada exitosamente con ID: ${createdSub.id}`);

  // 6. Probar creación de variantes en service_catalog_variants
  console.log('\n--- PRUEBA 5: Creación y Actualización de Variantes ---');
  const variantPayload = {
    organization_id: orgId,
    catalog_item_id: createdProduct.id,
    name: 'Talla L / Color Negro',
    sku: 'SKU-VAR-L-BLK',
    price_override: 175000,
    price_modifier: 25000,
    price_type: 'fixed',
    inventory_quantity: 20,
    track_inventory: true,
    is_active: true,
    order_index: 0,
    attributes: { Talla: 'L', Color: 'Negro' },
  };

  const { data: createdVariant, error: varError } = await supabase
    .from('service_catalog_variants')
    .insert(variantPayload)
    .select()
    .single();

  if (varError) {
    console.error('❌ Error al crear variante:', varError);
    process.exit(1);
  }
  console.log(`✅ Variante creada exitosamente con ID: ${createdVariant.id}`);

  // Actualizar stock de variante
  const { data: updatedVariant, error: varUpdateError } = await supabase
    .from('service_catalog_variants')
    .update({
      inventory_quantity: 15,
      sku: 'SKU-VAR-L-BLK-V2',
    })
    .eq('id', createdVariant.id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (varUpdateError) {
    console.error('❌ Error al actualizar variante:', varUpdateError);
    process.exit(1);
  }
  console.log(`✅ Variante actualizada exitosamente. Stock restante: ${updatedVariant.inventory_quantity}`);

  // 7. Probar personalización de tienda en organization_settings
  console.log('\n--- PRUEBA 6: Configuración del Portal de Tienda (Personalizador) ---');
  const themeConfig = {
    theme: 'modern',
    primary_color: '#4F46E5',
    secondary_color: '#EC4899',
    accent_color: '#10B981',
    primary_cta: 'cart',
    hero: {
      enabled: true,
      title: 'Tienda Oficial 2026',
      subtitle: 'Envíos a todo el país',
      cta_text: 'Ver Catálogo',
      cta_url: '#catalog',
      bg_gradient: 'from-slate-900 to-indigo-950',
    },
    navigation_style: 'pills',
    card_layout: 'grid',
    enable_search: true,
    enable_whatsapp_checkout: true,
    enable_quote_request: true,
    enable_qr_code: true,
    business_hours: {
      monday_friday: '08:00 - 18:00',
      saturday: '09:00 - 14:00',
      sunday: 'Cerrado',
    },
    social_links: {
      whatsapp: '573001234567',
      instagram: '@pixyagency',
    },
    faq: [
      { question: '¿Cómo comprar?', answer: 'Agrega al carrito y finaliza por WhatsApp o pago online.' },
    ],
    testimonials: [],
  };

  const { error: settingsError } = await supabase
    .from('organization_settings')
    .update({
      portal_theme_config: themeConfig,
      portal_primary_color: themeConfig.primary_color,
      portal_secondary_color: themeConfig.secondary_color,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId);

  if (settingsError) {
    console.error('❌ Error al guardar tema del portal:', settingsError);
    process.exit(1);
  }
  console.log('✅ Configuración del personalizador de tienda guardada exitosamente');

  // Limpieza de datos de prueba
  console.log('\n--- LIMPIEZA DE DATOS DE PRUEBA ---');
  await supabase.from('service_catalog_variants').delete().eq('id', createdVariant.id);
  await supabase.from('service_catalog').delete().eq('id', createdProduct.id);
  await supabase.from('service_catalog').delete().eq('id', createdService.id);
  await supabase.from('service_catalog').delete().eq('id', createdSub.id);
  console.log('✅ Datos de prueba limpiados correctamente');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS REALES DE BASE DE DATOS Y FLUJOS PASARON AL 100% SIN ERRORES!');
}

testRealCatalogFlows().catch((e) => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
