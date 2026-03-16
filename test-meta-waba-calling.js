
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testWabaCalling() {
    const accessToken = process.env.META_API_TOKEN;
    const wabaId = "1541979373724497"; 
    
    console.log(`Testing Meta API (Calling at WABA level): ${wabaId}...`);
    try {
        const url = `https://graph.facebook.com/v22.0/${wabaId}?fields=id,calling,whatsapp_business_encryption&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) {
            console.log('WABA_ERROR:', data.error.message);
        } else {
            console.log('WABA_STATUS:', data.calling || 'NOT FOUND');
        }
    } catch (e) {
        console.log('WABA_FETCH_FAILED:', e.message);
    }
}

testWabaCalling();
