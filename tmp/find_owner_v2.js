
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
// We try to read from common locations
const fs = require('fs');
const path = require('path');

let envConfig = {};
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) envConfig[key.trim()] = value.trim();
        });
    }
} catch (e) {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Credentials missing. Trying to get from process.env directly...");
}

const supabase = createClient(url, key);

async function findOwner() {
    const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, owner_id')
        .ilike('name', '%dannicel%');
    
    if (!orgs?.length) { console.log("Org not found"); return; }
    
    const org = orgs[0];
    console.log(`\nOrganization: ${org.name}`);
    console.log(`Owner ID (from organizations table): ${org.owner_id}`);

    if (org.owner_id) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', org.owner_id)
            .single();
        
        console.log(`Owner Profile: ${profile?.full_name} (${profile?.email})`);
    } else {
        console.log("No owner_id set in organizations table. Checking for 'owner' role in members...");
        const { data: owners } = await supabase
            .from('organization_members')
            .select('user_id, profiles:user_id(email, full_name)')
            .eq('organization_id', org.id)
            .eq('role', 'owner');
        
        owners?.forEach(o => {
            console.log(`Owner from members: ${o.profiles.full_name} (${o.profiles.email})`);
        });
    }

    // Also check current members to see if dannicel@gmail.com matches
    const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, role, profiles:user_id(email)')
        .eq('organization_id', org.id);
    
    console.log("\nMembers Verification:");
    members?.forEach(m => {
        console.log(`- ${m.profiles.email}: role=${m.role}`);
    });
}

findOwner();
