
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- DIAGNOSTIC START ---");

    // 1. Check Clients Columns
    const { data: clientCols, error: clientColErr } = await supabase.from('clients').select('*').limit(1);
    console.log("Clients sample data keys:", clientCols && clientCols[0] ? Object.keys(clientCols[0]) : "No data or Table empty", clientColErr || "");

    // 2. Check Service Catalog Columns
    const { data: serviceCols, error: serviceColErr } = await supabase.from('service_catalog').select('*').limit(1);
    console.log("Service Catalog sample data keys:", serviceCols && serviceCols[0] ? Object.keys(serviceCols[0]) : "No data or Table empty", serviceColErr || "");

    // 3. Check Organization Context
    const { data: orgs } = await supabase.from('organizations').select('id, name').limit(5);
    console.log("Organizations in DB:", orgs?.map(o => `${o.name} (${o.id})`) || "None");

    if (orgs && orgs.length > 0) {
        for (const org of orgs) {
            const { count: cCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', org.id);
            const { count: sCount } = await supabase.from('service_catalog').select('*', { count: 'exact', head: true }).eq('organization_id', org.id);
            console.log(`Org: ${org.name} -> Clients: ${cCount}, Services: ${sCount}`);
        }
    }

    console.log("--- DIAGNOSTIC END ---");
}

diagnose();
