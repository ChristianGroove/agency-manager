import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
  console.log('--- DETAILED ORGS & USERS ---');

  // Check users
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log('USERS:');
  for (const u of users?.users || []) {
    console.log(` - ID: ${u.id} | Email: ${u.email} | Metadata:`, u.user_metadata);
  }

  // Check organization_members
  const { data: members } = await supabase
    .from('organization_members')
    .select('*, organization:organizations(*)');
  console.log('\nORGANIZATION MEMBERS:');
  for (const m of members || []) {
    console.log(` - UserID: ${m.user_id} | OrgID: ${m.organization_id} | Role: ${m.role} | OrgName: ${m.organization?.name} | SpaceCat: ${m.organization?.space_category}`);
  }

  // Check all service_categories grouped by org
  const { data: categories } = await supabase
    .from('service_categories')
    .select('*');
  console.log('\nCATEGORIES BY ORG:');
  const orgCats: Record<string, any[]> = {};
  for (const c of categories || []) {
    if (!orgCats[c.organization_id]) orgCats[c.organization_id] = [];
    orgCats[c.organization_id].push(c);
  }
  for (const [orgId, cats] of Object.entries(orgCats)) {
    console.log(`\nOrgID: ${orgId} (${cats.length} categories):`);
    cats.forEach(c => console.log(`   - [${c.id}] ${c.name} (${c.slug}) | icon: ${c.icon} | color: ${c.color}`));
  }
}

main();
