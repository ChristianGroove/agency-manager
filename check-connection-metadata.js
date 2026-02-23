
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMetadata() {
    console.log('--- Checking Connection Metadata ---');

    console.log('Use LIKE filter for: Pollo');
    const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%');

    if (!orgs || orgs.length === 0) return console.log('❌ No orgs found');
    const org = orgs[0];
    console.log(`Found Org: ${org.name} (${org.id})`);

    const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', org.id);

    // Filter by WABA ID
    const connection = connections.find(c => c.metadata?.waba_id === '909228274804708');

    if (!connection) return console.log('❌ Connection not found');

    console.log(`Connection ID: ${connection.id}`);
    console.log(`Updated At: ${connection.updated_at}`);
    console.log('Metadata:', JSON.stringify(connection.metadata, null, 2));
}

checkMetadata();
