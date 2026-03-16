
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMetaApi() {
    const accessToken = process.env.META_API_TOKEN;
    // Test with the Pixy Spaces ID found in DB
    const phoneNumberId = "917233028147729"; 
    
    console.log(`Testing Meta API for Phone ID: ${phoneNumberId}...`);
    
    try {
        const url = `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=id,display_phone_number,calling&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        
        console.log('GET RESPONSE:', JSON.stringify(data, null, 2));
        
        if (data.error) {
            console.error('❌ Meta API returned error:', data.error.message);
        } else {
            console.log('✅ Meta API Success. Calling status:', data.calling?.status || 'NOT SET');
        }
    } catch (e) {
        console.error('❌ Fetch failed:', e.message);
    }
}

testMetaApi();
