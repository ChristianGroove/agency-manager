import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
  const { data: user } = await supabase.auth.admin.getUserById('c3b2058f-487c-442f-a9a0-c1c7d3fb0883');
  console.log('USER c3b2058f:', user);

  // Check all orgs for this user
  const { data: members } = await supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883');
  console.log('MEMBERSHIPS:', members);
}

main();
