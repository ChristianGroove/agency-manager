
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendTestMessage() {
    console.log('--- Sending Test Message ---');

    console.log('1. Fetching Connection...');
    const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%');

    if (!orgs || orgs.length === 0) return console.log('❌ No orgs found');
    const org = orgs[0];
    console.log(`Org: ${org.name}`);

    const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', org.id);

    const connection = connections.find(c => c.metadata?.waba_id === '909228274804708');

    if (!connection) return console.log('❌ Connection not found');

    const accessToken = connection.credentials.access_token;
    const phoneId = connection.metadata.asset_id; // Phone ID

    console.log(`Phone ID: ${phoneId}`);

    // Target: Christian Groove's number from logs: 573006705958
    const to = '573006705958';

    try {
        console.log(`2. Sending to ${to}...`);
        const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: 'hello_world', // Standard test template usually available
                language: {
                    code: 'en_US'
                }
            }
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const res = await axios.post(url, payload, config);
        console.log('✅ Message Sent! ID:', res.data.messages[0].id);

    } catch (error) {
        console.error('❌ Send Failed!');
        const fs = require('fs');
        if (error.response) {
            console.error('Status:', error.response.status);
            fs.writeFileSync('error.json', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
            fs.writeFileSync('error.json', JSON.stringify({ error: error.message }, null, 2));
        }
    }
}

sendTestMessage();
