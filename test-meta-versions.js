
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testVersions() {
    const accessToken = process.env.META_API_TOKEN;
    const phoneNumberId = "917233028147729"; 
    
    // Test v18.0 which is known for calling
    const version = 'v19.0';
    console.log(`Testing Meta API ${version}...`);
    
    try {
        const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=id,display_phone_number,calling&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) {
            console.log('V18_ERROR:', data.error.message);
        } else {
            console.log('V18_STATUS:', data.calling?.status || 'NONE');
        }
    } catch (e) {
        console.log('V18_FETCH_FAILED:', e.message);
    }
}

testVersions();
