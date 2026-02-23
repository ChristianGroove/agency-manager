
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPhone() {
    console.log('--- Debugging Phone Status ---');

    console.log('1. Fetching Connection...');
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
        const url = `https://graph.facebook.com/v21.0/${phoneId}?fields=id,display_phone_number,name_status,code_verification_status,quality_rating,platform_type,throughput,account_mode`;
        const res = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log('✅ Phone Details:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('❌ Error fetching phone details:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data, null, 2));
    }
}

debugPhone();
