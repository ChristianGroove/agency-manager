
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkRoles() {
    const { data: orgs } = await supabase.from('organizations').select('id, name').ilike('name', '%dannicel%');
    if (!orgs?.length) { console.log("Org not found"); return; }
    
    const orgId = orgs[0].id;
    console.log(`Checking roles for Org ID: ${orgId}`);

    const { data: roles, error } = await supabase
        .from('organization_roles')
        .select('*')
        .eq('organization_id', orgId);
    
    if (error) { console.error("Error:", error); return; }

    roles.forEach(role => {
        console.log(`\nRole: ${role.name} (is_system: ${role.is_system_role})`);
        console.log(`Permissions:`, JSON.stringify(role.permissions, null, 2));
    });

    const { data: members } = await supabase
        .from('organization_members')
        .select(`
            role, 
            role_id,
            profiles:user_id(email, full_name, platform_role)
        `)
        .eq('organization_id', orgId);
    
    console.log("\nMembers:");
    members.forEach(m => {
        console.log(`- ${m.profiles.email}: Legacy=${m.role}, RoleID=${m.role_id}`);
    });
}

checkRoles();
