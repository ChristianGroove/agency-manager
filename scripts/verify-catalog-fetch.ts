import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);
const ORG_ID = 'db9d1288-80ab-48df-b130-a0739881c6f2'; // Pixy Agency

async function main() {
  console.log('--- VERIFYING CATALOG FETCH FOR SUPERADMIN ORG ---');

  // 1. Fetch items with relations
  const { data: items, error: iErr } = await supabase
    .from('service_catalog')
    .select(`
      *,
      category_obj:service_categories(*)
    `)
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false });

  if (iErr) {
    console.error('❌ Items fetch error:', iErr);
    return;
  }

  console.log(`✅ Fetched ${items.length} items from service_catalog:`);
  for (const it of items) {
    const meta = it.metadata || {};
    const gallery = it.gallery_images || meta.gallery_images || [];
    const badges = it.badges || meta.badges || [];
    console.log(`\n📌 [${it.id}] "${it.name}"`);
    console.log(`   - Category: ${it.category} (${it.category_id})`);
    console.log(`   - Base Price: $${it.base_price?.toLocaleString()} COP | Compare: $${it.compare_at_price?.toLocaleString() || 'N/A'}`);
    console.log(`   - Classification: ${it.classification} | Type: ${it.type}`);
    console.log(`   - Gallery Photos: ${gallery.length} images`);
    console.log(`   - Badges: ${badges.join(', ')}`);

    // Fetch variants
    const { data: variants } = await supabase
      .from('service_catalog_variants')
      .select('*')
      .eq('catalog_item_id', it.id);
    console.log(`   - Variants: ${variants?.length || 0} registered in DB`);

    // Fetch addons
    const { data: linkedAddons } = await supabase
      .from('service_catalog_item_addons')
      .select('addon:service_catalog_addons(*)')
      .eq('item_id', it.id);
    console.log(`   - Add-on Groups: ${linkedAddons?.length || 0} linked`);
  }

  // 2. Fetch Theme Config
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('portal_theme_config, portal_primary_color, portal_secondary_color')
    .eq('organization_id', ORG_ID)
    .single();

  console.log('\n🎨 STOREFRONT THEME CONFIG:');
  console.log(JSON.stringify(settings?.portal_theme_config, null, 2));
}

main();
