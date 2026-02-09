
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    // 1. Find Org
    const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', '%Pixy%')
        .limit(1);

    if (!orgs?.length) return console.log('Org not found');

    const orgId = orgs[0].id;
    console.log(`ORG: ${orgs[0].name} (${orgId})`);

    // 2. Find Members with Owner-like roles
    const { data: members } = await supabase
        .from('organization_members')
        .select(`
        user_id,
        role,
        role_id,
        role_data:organization_roles(name, is_system_role, permissions)
    `)
        .eq('organization_id', orgId);

    if (!members) return console.log('No members');

    console.log(`MEMBERS (${members.length}):`);

    members.forEach(m => {
        // Check if this member looks like an owner
        const roleName = Array.isArray(m.role_data) ? m.role_data[0]?.name : m.role_data?.name;
        const rolePerms = Array.isArray(m.role_data) ? m.role_data[0]?.permissions : m.role_data?.permissions;

        console.log(`User: ${m.user_id}`);
        console.log(`Legacy Role: ${m.role}`);
        console.log(`Linked Role: ${roleName}`);
        console.log(`Permissions: ${JSON.stringify(rolePerms)}`);

        // Check specifically for 'all'
        if (rolePerms && (rolePerms as any).all === true) {
            console.log('✅ HAS WILDCARD PERMISSION');
        } else {
            console.log('❌ MISSING WILDCARD PERMISSION');
        }
        console.log('---');
    });
}

main();
