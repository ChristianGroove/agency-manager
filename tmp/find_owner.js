
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findOwner() {
    console.log("Searching for organization 'dannicel comunicaciones'...");
    const { data: orgs } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .ilike('name', '%dannicel%');
    
    if (!orgs || orgs.length === 0) {
        console.log("No organization found.");
        return;
    }

    const org = orgs[0];
    console.log(`Org: ${org.name} (${org.id})`);

    const { data: members } = await supabaseAdmin
        .from('organization_members')
        .select(`
            user_id,
            role,
            role_id,
            organization_roles(name),
            profiles:user_id(email, full_name, platform_role)
        `)
        .eq('organization_id', org.id);

    console.log("\nMembers:");
    members.forEach(m => {
        console.log(`- ${m.profiles.email} (${m.profiles.full_name})`);
        console.log(`  Role (Legacy): ${m.role}`);
        console.log(`  Role ID: ${m.role_id}`);
        console.log(`  Dynamic Role: ${m.organization_roles?.name || 'N/A'}`);
        console.log(`  Platform Role: ${m.profiles.platform_role}`);
        console.log("  ---");
    });
}

findOwner();
