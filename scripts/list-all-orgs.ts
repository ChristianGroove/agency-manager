import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('ALL ORGANIZATIONS:');
  for (const o of orgs || []) {
    console.log(`- [${o.id}] Name: "${o.name}" | Slug: "${o.slug}" | Owner: "${o.owner_id}" | App: "${o.app_type}" | SpaceCat: "${o.space_category}"`);
  }

  // Check platform_roles / superadmin
  const { data: platformRoles } = await supabase.from('platform_roles').select('*');
  console.log('\nPLATFORM ROLES:');
  console.log(platformRoles);
}

main();
