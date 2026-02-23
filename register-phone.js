
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function registerPhone() {
    console.log('--- Attempting Phone Registration (Coexistence) ---');

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
    const phoneId = connection.metadata.asset_id;

    console.log(`Phone ID: ${phoneId}`);

    try {
        // Step 1: Register
        // Note: Usually requires a Cert, but for Coexistence/Embedded sometimes just a PIN or empty details works if pre-verified
        const url = `https://graph.facebook.com/v21.0/${phoneId}/register`;

        const payload = {
            messaging_product: 'whatsapp',
            pin: '123456' // Dummy PIN, will likely fail if 2FA is on, but we need to see the ERROR
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        console.log(`Attempting POST ${url}...`);
        const res = await axios.post(url, payload, config);
        console.log('✅ Registration Result:', JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error('❌ Registration Failed:', error.response ? error.response.status : error.message);
        if (error.response) {
            console.error('Error Body:', JSON.stringify(error.response.data, null, 2));
            const fs = require('fs');
            fs.writeFileSync('registration-error.json', JSON.stringify(error.response.data, null, 2));
        }
    }
}

registerPhone();
