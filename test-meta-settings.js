
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testSettings() {
    const accessToken = process.env.META_API_TOKEN;
    const phoneNumberId = "917233028147729"; 
    
    console.log(`Testing Meta API settings for Phone ID: ${phoneNumberId}...`);
    try {
        const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/settings?access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        
        console.log('SETTINGS_RESPONSE:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('SETTINGS_FETCH_FAILED:', e.message);
    }
}

testSettings();
