
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllWABAS() {
    console.log('--- Listing All Accessible WABAs ---');

    const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%');

    if (!orgs || orgs.length === 0) return console.log('❌ No orgs found');
    const org = orgs[0];

    // We use the token from the existing 'whatsapp' connection
    const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', org.id);

    // Look for ANY meta connection to get a token
    const connection = connections.find(c => c.credentials?.access_token);
    if (!connection) return console.log('❌ No connection found to steal token from.');

    const accessToken = connection.credentials.access_token;
    console.log(`Using Access Token from connection: ${connection.id}`);

    try {
        // Direct query to getting WABAs if the token has granual permissions
        // Or get ID first
        const meUrl = `https://graph.facebook.com/v21.0/me?access_token=${accessToken}`;
        const meRes = await axios.get(meUrl);
        console.log(`Me: ${meRes.data.name} (ID: ${meRes.data.id})`);

        // Try to list WABA's directly shared with this user
        console.log('\n--- Checking Shared WABAs ---');
        try {
            const sharedUrl = `https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`;
            const sharedRes = await axios.get(sharedUrl);
            const businesses = sharedRes.data.data;
            console.log(`Found ${businesses.length} Businesses.`);

            for (const biz of businesses) {
                console.log(`Scanning Business: ${biz.name} (${biz.id})`);
                const wabaUrl = `https://graph.facebook.com/v21.0/${biz.id}/client_whatsapp_business_accounts?access_token=${accessToken}`;
                const ownedWabaUrl = `https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`;

                try {
                    const res1 = await axios.get(ownedWabaUrl);
                    if (res1.data.data.length > 0) console.log('  [OWNED WABAs]:', JSON.stringify(res1.data.data, null, 2));

                    const res2 = await axios.get(wabaUrl);
                    if (res2.data.data.length > 0) console.log('  [CLIENT WABAs]:', JSON.stringify(res2.data.data, null, 2));

                } catch (e) {
                    // Ignore permission errors per business
                    process.stdout.write('.');
                }
            }

        } catch (e) {
            console.log('Failed to list businesses:', e.message);
        }

    } catch (e) {
        console.error('❌ Error:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

listAllWABAS();
