
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testMetaApi() {
    const accessToken = process.env.META_API_TOKEN;
    const phoneNumberId = "917233028147729"; 
    
    console.log(`Testing Meta API for Phone ID: ${phoneNumberId}`);
    
    try {
        const url = `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=id,calling,display_phone_number&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) {
            console.log('ERROR_MSG:', data.error.message);
            console.log('ERROR_CODE:', data.error.code);
            console.log('ERROR_SUBCODE:', data.error.error_subcode);
        } else {
            console.log('STATUS:', data.calling?.status || 'NONE');
            console.log('ICON:', data.calling?.call_icon_visibility || 'NONE');
        }
    } catch (e) {
        console.log('FETCH_FAILED:', e.message);
    }
}

testMetaApi();
