
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- DIAGNOSTIC START ---");

    // 1. Check if tables exist and have data
    const { count: clientCount, error: clientErr } = await supabase.from('clients').select('*', { count: 'exact', head: true });
    console.log("Total clients in DB:", clientCount, clientErr || "");

    const { count: serviceCount, error: serviceErr } = await supabase.from('service_catalog').select('*', { count: 'exact', head: true });
    console.log("Total services in DB:", serviceCount, serviceErr || "");

    // 2. Check a sample org
    const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
    if (orgs && orgs.length > 0) {
        const orgId = orgs[0].id;
        console.log(`Checking data for Org: ${orgs[0].name} (${orgId})`);

        const { data: orgClients } = await supabase.from('clients').select('id, name').eq('organization_id', orgId);
        console.log(`Clients for this org: ${orgClients?.length || 0}`);

        const { data: orgServices } = await supabase.from('service_catalog').select('id, name').eq('organization_id', orgId);
        console.log(`Services for this org: ${orgServices?.length || 0}`);
    } else {
        console.log("No organizations found in DB");
    }

    console.log("--- DIAGNOSTIC END ---");
}

diagnose();
