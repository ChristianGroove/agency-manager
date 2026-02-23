
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMetadata() {
    console.log('--- Checking Connection Metadata ---');

    const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%');

    const org = orgs[0];

    const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', org.id);

    const connection = connections.find(c => c.metadata?.waba_id === '909228274804708');

    if (connection) {
        console.log('Metadata:', JSON.stringify(connection.metadata, null, 2));
    } else {
        console.log('Connection not found');
    }
}

checkMetadata();
