
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

async function checkSubscription() {
    const appId = process.env.META_APP_ID;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.META_PERMANENT_ACCESS_TOKEN;

    console.log(`--- Checking Subscription for WABA: ${wabaId} ---`);

    const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps?access_token=${accessToken}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Subscription Data:", JSON.stringify(data, null, 2));

        if (data.data && data.data.length > 0) {
            const sub = data.data.find(s => s.whatsapp_business_account_id === wabaId || s.id === appId);
            if (sub) {
                console.log("\n✅ Subscribed Fields:", sub.subscribed_fields);
            } else {
                console.log("\n⚠️ Not subscribed to this App ID specifically?");
            }
        } else {
            console.log("\n❌ NO SUBSCRIPTIONS FOUND for this WABA.");
        }
    } catch (e) {
        console.error("Error fetching subscription:", e);
    }
}

checkSubscription();
