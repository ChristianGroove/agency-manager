import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
  const orgId = 'db9d1288-80ab-48df-b130-a0739881c6f2';
  console.log('--- INSPECTING PIXY AGENCY (SUPERADMIN ORG: db9d1288-80ab-48df-b130-a0739881c6f2) ---');

  // Categories
  const { data: cats } = await supabase
    .from('service_categories')
    .select('*')
    .eq('organization_id', orgId)
    .order('order_index', { ascending: true });
  console.log(`\nCATEGORIES (${cats?.length || 0}):`);
  cats?.forEach(c => console.log(` - ID: ${c.id} | Name: "${c.name}" | Slug: "${c.slug}" | Icon: "${c.icon}" | Color: "${c.color}"`));

  // Current items
  const { data: items } = await supabase
    .from('service_catalog')
    .select('*')
    .eq('organization_id', orgId);
  console.log(`\nCURRENT ITEMS (${items?.length || 0}):`);
  items?.forEach(i => console.log(` - ID: ${i.id} | Name: "${i.name}" | Cat: "${i.category}" | CatID: "${i.category_id}" | Price: $${i.base_price}`));

  // Theme settings
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('portal_theme_config, portal_primary_color, portal_secondary_color')
    .eq('organization_id', orgId)
    .maybeSingle();
  console.log(`\nORGANIZATION SETTINGS:`, settings);
}

main();
