import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log('--- INSPECTING LOCAL USERS & ORGANIZATIONS ---');

  // 1. Check users
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) console.error('Users error:', uErr);
  else {
    console.log(`Found ${users.users.length} users:`);
    users.users.forEach(u => console.log(` - ID: ${u.id} | Email: ${u.email} | Role: ${u.role}`));
  }

  // 2. Check organizations
  const { data: orgs, error: oErr } = await supabase
    .from('organizations')
    .select('id, name, slug, owner_id, app_type, space_category');
  if (oErr) console.error('Orgs error:', oErr);
  else {
    console.log(`Found ${orgs?.length || 0} organizations:`);
    orgs?.forEach(o => console.log(` - ID: ${o.id} | Name: ${o.name} | Slug: ${o.slug} | SpaceCategory: ${o.space_category}`));
  }

  // 3. Check categories
  const { data: categories, error: cErr } = await supabase
    .from('service_categories')
    .select('*');
  if (cErr) console.error('Categories error:', cErr);
  else {
    console.log(`Found ${categories?.length || 0} categories:`);
    categories?.forEach(c => console.log(` - ID: ${c.id} | OrgID: ${c.organization_id} | Name: ${c.name} | Slug: ${c.slug}`));
  }

  // 4. Check existing service_catalog items
  const { data: items, error: iErr } = await supabase
    .from('service_catalog')
    .select('id, name, category, organization_id, type');
  if (iErr) console.error('Items error:', iErr);
  else {
    console.log(`Found ${items?.length || 0} catalog items:`);
    items?.forEach(i => console.log(` - ID: ${i.id} | OrgID: ${i.organization_id} | Name: ${i.name} | Cat: ${i.category} | Type: ${i.type}`));
  }
}

main();
