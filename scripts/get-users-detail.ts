import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log('USER DETAILS:');
  for (const u of users?.users || []) {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Meta:`, u.user_metadata, u.app_metadata);
  }
}

main();
