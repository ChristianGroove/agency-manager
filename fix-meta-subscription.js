
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSubscription() {
    console.log('--- Fixing Meta WABA Subscription ---');

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
        .select('*')
        .eq('organization_id', org.id);

    // Filter by WABA ID
    const connection = connections.find(c => c.metadata?.waba_id === '909228274804708');

    if (!connection) return console.log('❌ Connection not found');

    const accessToken = connection.credentials.access_token;
    const wabaId = connection.metadata.waba_id;

    console.log(`WABA ID: ${wabaId}`);
    if (!accessToken) return console.log('❌ No Access Token found');

    try {
        // 0. CLEAR SUBSCRIPTION (DELETE)
        console.log('\n--- Clearing Subscription (DELETE) ---');
        try {
            await axios.delete(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps?access_token=${accessToken}`);
            console.log('✅ Deleted successfully');
        } catch (e) {
            console.log('⚠️ Delete failed:', e.message);
        }

        // 1. SUBSCRIBE TO MESSAGES (Targeting App Logic)
        console.log('\n--- Subscribing to fields (App Logic Match) ---');

        const subUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`;

        const payload = {
            subscribed_fields: ['messages', 'calls', 'automatic_events', 'smb_message_echoes'] // EXACTLY AS IN MANAGER
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const subRes = await axios.post(subUrl, payload, config);
        console.log('✅ Subscription Result:', JSON.stringify(subRes.data, null, 2));

        // 3. Verify Again
        console.log('\n--- Verifying New Subscription ---');
        const checkUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps?access_token=${accessToken}`;
        const checkRes = await axios.get(checkUrl);
        console.log('Current Subscriptions:', JSON.stringify(checkRes.data, null, 2));

    } catch (error) {
        console.error('❌ Meta API Error:', error.response ? error.response.data : error.message);
    }
}

fixSubscription();
