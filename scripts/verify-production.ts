
import axios from 'axios';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN;
const APP_ID = process.env.META_APP_ID;

if (!WABA_ID || !TOKEN) {
    console.error('❌ Missing Env Vars in .env.local');
    process.exit(1);
}

async function verifySubscription() {
    console.log(`Checking subscription for WABA: ${WABA_ID}`);
    try {
        const url = `https://graph.facebook.com/v24.0/${WABA_ID}/subscribed_apps`;
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Subscription Status:', response.data);
        if (response.data && response.data.data) {
            console.log('✅ WABA Connection Verified!');
        } else {
            console.log('⚠️ Unexpected response format', response.data);
        }

    } catch (error: any) {
        console.error('❌ Check Failed:', error.response?.data || error.message);
    }
}

verifySubscription();
