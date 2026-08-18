import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
  console.log('--- CHECKING TABLES IN DB ---');
  const tables = [
    'service_catalog',
    'service_categories',
    'service_catalog_attributes',
    'service_catalog_attribute_options',
    'service_catalog_variants',
    'service_catalog_addons',
    'service_catalog_addon_options',
    'service_catalog_item_addons',
    'catalog_gallery_images',
    'catalog_attribute_groups',
    'catalog_attribute_options',
    'catalog_variants',
    'catalog_addon_groups',
    'catalog_addon_options',
    'organization_settings',
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table "${table}": ${error.message}`);
    } else {
      console.log(`✅ Table "${table}": OK (columns: ${Object.keys(data[0] || {}).join(', ')})`);
    }
  }
}

main();
