
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testToggle() {
    const accessToken = process.env.META_API_TOKEN;
    const phoneNumberId = "917233028147729"; 
    
    console.log(`Attempting to toggle calling for Phone ID: ${phoneNumberId}...`);
    try {
        const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/settings`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                calling: {
                    status: 'ENABLED',
                    call_icon_visibility: 'DEFAULT'
                }
            })
        });
        const data = await res.json();
        
        console.log('TOGGLE_RESPONSE:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('TOGGLE_FETCH_FAILED:', e.message);
    }
}

testToggle();
