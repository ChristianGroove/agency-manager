
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enableCoexistence() {
    console.log('--- Enabling Coexistence Mode (App + API) ---');

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
    const wabaId = connection.metadata.waba_id;

    console.log(`WABA ID: ${wabaId}`);

    try {
        // 2. SUBSCRIBE TO COEXISTENCE FIELDS
        // Reference: src/lib/meta/onboarding/embedded-signup-handler.ts
        // Fields: messages, smb_message_echoes, history

        console.log('\n--- Subscribing to Coexistence Fields (Start) ---');

        const subUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`;

        const payload = {
            subscribed_fields: ['messages', 'smb_message_echoes', 'history']
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const subRes = await axios.post(subUrl, payload, config);
        console.log('✅ Coexistence Subscription Result:', JSON.stringify(subRes.data, null, 2));

        // 3. Verify
        console.log('\n--- Verifying Active Fields ---');
        const checkUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps?access_token=${accessToken}`;
        const checkRes = await axios.get(checkUrl);
        console.log('Current Subscriptions:', JSON.stringify(checkRes.data, null, 2));

        const fs = require('fs');
        fs.writeFileSync('coexistence-result.txt', JSON.stringify(checkRes.data, null, 2));

    } catch (error) {
        console.error('❌ Coexistence Setup Failed:', error.response ? error.response.data : error.message);
    }
}

enableCoexistence();
