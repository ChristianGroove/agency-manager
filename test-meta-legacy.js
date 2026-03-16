
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testVersions() {
    const accessToken = process.env.META_API_TOKEN;
    const phoneNumberId = "917233028147729"; 
    
    // Test v17.0 and v18.0
    for (const version of ['v17.0', 'v18.0']) {
        console.log(`Testing Meta API ${version}...`);
        try {
            const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=id,display_phone_number,calling&access_token=${accessToken}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) {
                console.log(`${version}_ERROR:`, data.error.message);
            } else {
                console.log(`${version}_STATUS:`, data.calling?.status || 'NONE');
            }
        } catch (e) {
            console.log(`${version}_FETCH_FAILED:`, e.message);
        }
    }
}

testVersions();
