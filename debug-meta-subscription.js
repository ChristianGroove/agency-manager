
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMetaStatus() {
    console.log('--- Checking Meta WABA Status ---');

    // 1. Get Connection
    const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%');

    if (!orgs || orgs.length === 0) return console.log('❌ No orgs found');
    const org = orgs[0];
    console.log(`Found Org: ${org.name} (${org.id})`);

    const { data: connections } = await supabase
        .from('integration_connections')
        .select('id, provider_key, metadata, credentials')
        .eq('organization_id', org.id);

    console.log(`\nFound ${connections.length} connections for this org:`);
    connections.forEach(c => {
        console.log(`- [${c.provider_key}] ID: ${c.id}`);
        console.log(`  Metadata WABA: ${c.metadata?.waba_id}`);
    });

    const connection = connections.find(c => c.metadata?.waba_id === '909228274804708');

    if (!connection) return console.log('❌ Connection not found');

    const accessToken = connection.credentials.access_token;
    const wabaId = connection.metadata.waba_id;
    const phoneId = connection.metadata.asset_id;

    console.log(`Found Connection: ${connection.id}`);
    console.log(`WABA ID: ${wabaId}`);
    console.log(`Phone ID: ${phoneId}`);

    if (!accessToken) return console.log('❌ No Access Token found');

    console.log(`\n--- Debugging Data ---`);
    console.log(`WABA ID (Type: ${typeof wabaId}): '${wabaId}'`);
    console.log(`Phone ID (Type: ${typeof phoneId}): '${phoneId}'`);
    console.log(`Access Token: ${accessToken.substring(0, 15)}...`);

    try {
        // 2. Check WABA Subscribed Apps WITH FIELDS
        console.log('\n--- Checking Webhook Subscription ---');
        const subUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps?fields=name,link,subscribed_fields&access_token=${accessToken}`;
        const subRes = await axios.get(subUrl);
        console.log('Subscribed Apps:', JSON.stringify(subRes.data, null, 2));

        // 3. Check Phone Number Status
        console.log('\n--- Checking Phone Number Status ---');
        const phoneUrl = `https://graph.facebook.com/v21.0/${phoneId}?fields=name_status,quality_rating,display_phone_number&access_token=${accessToken}`;
        const phoneRes = await axios.get(phoneUrl);
        console.log('Phone Status:', JSON.stringify(phoneRes.data, null, 2));

    } catch (error) {
        console.error('❌ Meta API Error:', error.response ? error.response.data : error.message);
    }
}

checkMetaStatus();
