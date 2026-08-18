import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
  const superadminId = 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883';
  const { data: mems } = await supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', superadminId);

  console.log(`Memberships for superadmin (${superadminId}):`);
  mems?.forEach(m => console.log(` - Org: [${m.organization_id}] "${m.organization?.name}" (slug: ${m.organization?.slug}) | Role: ${m.role}`));

  // Check which orgs have service_categories
  const { data: allCats } = await supabase.from('service_categories').select('*');
  const orgCatsMap = new Map<string, number>();
  allCats?.forEach(c => orgCatsMap.set(c.organization_id, (orgCatsMap.get(c.organization_id) || 0) + 1));
  console.log('\nCategories count per org:');
  for (const [orgId, count] of orgCatsMap.entries()) {
    const { data: org } = await supabase.from('organizations').select('name, slug').eq('id', orgId).single();
    console.log(` - [${orgId}] "${org?.name}" (${org?.slug}): ${count} categories`);
  }
}

main();
