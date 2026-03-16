
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testWaba() {
    const accessToken = process.env.META_API_TOKEN;
    const wabaId = "1541979373724497"; 
    
    console.log(`Testing Meta API for WABA ID: ${wabaId}...`);
    try {
        const url = `https://graph.facebook.com/v22.0/${wabaId}?fields=id,name,message_template_namespace&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        
        console.log('WABA_RESPONSE:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('WABA_FETCH_FAILED:', e.message);
    }
}

testWaba();
