import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local manually
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) {
    env[k.trim()] = v.join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || 'http://127.0.0.1:55321';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPass() {
  const targetEmail = 'pixyspaces1@gmail.com';
  const newPass = 'Pixy2026*!';

  console.log(`🔍 Checking user ${targetEmail}...`);
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Error listing users:', listErr.message);
    process.exit(1);
  }

  let user = usersData.users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

  if (user) {
    console.log(`✅ User found (ID: ${user.id}). Updating password to: ${newPass}`);
    const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPass,
      email_confirm: true,
    });
    if (updErr) {
      console.error('❌ Error updating password:', updErr.message);
      process.exit(1);
    }
    console.log(`🎉 Password successfully set to "${newPass}" for ${targetEmail}`);
  } else {
    console.log(`User not found. Creating user with password: ${newPass}`);
    const { data: created, error: crtErr } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: newPass,
      email_confirm: true,
      user_metadata: { name: 'Praxis Inmobiliaria Admin' }
    });
    if (crtErr) {
      console.error('❌ Error creating user:', crtErr.message);
      process.exit(1);
    }
    user = created.user;
    console.log(`🎉 Created user ${created.user?.email} with password: "${newPass}"`);
  }

  // Check organization membership for Praxis Inmobiliaria
  const { data: org } = await supabase.from('organizations').select('id, name, slug').ilike('name', '%Praxis%').single();
  if (org && user) {
    console.log(`🏢 Praxis Organization ID: ${org.id} (${org.name})`);
    const { data: member } = await supabase.from('organization_members').select('*').eq('organization_id', org.id).eq('user_id', user.id);
    if (!member || member.length === 0) {
      console.log('Adding user as owner/admin in organization_members...');
      await supabase.from('organization_members').insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner'
      });
      console.log('✅ Added to organization_members as owner');
    } else {
      console.log('✅ Already member of Praxis Inmobiliaria:', member[0].role);
    }
  }

  process.exit(0);
}

resetPass();
