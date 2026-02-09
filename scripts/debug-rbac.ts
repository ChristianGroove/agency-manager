
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {

    // 1. Find Org
    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', '%Carnaval%')
        .limit(1);

    if (orgError || !orgs?.length) {
        console.error('Org not found or error:', orgError);
        return;
    }

    const orgId = orgs[0].id;
    console.log(`--- Debugging Org: ${orgs[0].name} (${orgId}) ---`);

    // 2. Get Members
    const { data: members, error: memberError } = await supabase
        .from('organization_members')
        .select(`
        user_id,
        role,
        role_id,
        role_data:organization_roles(*)
    `)
        .eq('organization_id', orgId);

    if (memberError) {
        console.error('Member Error:', memberError);
    } else {
        console.log(`Found ${members.length} members:`);
        members.forEach(m => {
            console.log(`- User: ${m.user_id}`);
            console.log(`  Legacy Role: ${m.role}`);
            console.log(`  Role ID: ${m.role_id}`);
            // Handle array or object response for role_data
            const rd = Array.isArray(m.role_data) ? m.role_data[0] : m.role_data;
            console.log(`  Linked Role Name: ${rd?.name}`);
            console.log(`  Linked Role IsSystem: ${rd?.is_system_role}`);
            console.log(`  Linked Role Perms:`, JSON.stringify(rd?.permissions));
            console.log('---');
        });
    }

    // 3. Get Roles
    const { data: roles, error: roleError } = await supabase
        .from('organization_roles')
        .select('*')
        .eq('organization_id', orgId);

    if (roleError) {
        console.error('Role Error:', roleError);
    } else {
        console.log(`Found ${roles.length} roles:`);
        roles.forEach(r => {
            console.log(`- Role: ${r.name} (System: ${r.is_system_role})`);
            console.log(`  ID: ${r.id}`);
            console.log(`  Perms:`, JSON.stringify(r.permissions));
        });
    }
}

main();
