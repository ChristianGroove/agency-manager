
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugToken() {
    console.log('--- Debugging Meta Access Token ---');

    // 1. Get Connection
    const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%');

    if (!orgs || orgs.length === 0) return console.log('❌ No orgs found');
    const org = orgs[0];

    const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', org.id);

    const connection = connections.find(c => c.metadata?.waba_id === '909228274804708');

    if (!connection) return console.log('❌ Connection not found');

    const accessToken = connection.credentials.access_token;

    if (!accessToken) return console.log('❌ No Access Token found');

    try {
        // 2. Debug Token
        // We need an "app access token" or we can use the user token to debug itself (sometimes works, or use known app id/secret)
        // Let's try using the token itself first.

        console.log(`\n--- Inspecting Token: ${accessToken.substring(0, 10)}... ---`);

        const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
        const res = await axios.get(debugUrl);

        console.log(JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error('❌ Meta API Error:', error.response ? error.response.data : error.message);
    }
}

debugToken();
