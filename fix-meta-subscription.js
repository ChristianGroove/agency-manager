
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

async function fixSubscription() {
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.META_PERMANENT_ACCESS_TOKEN;
    const productionUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/messaging?channel=whatsapp';
    const verifyToken = 'pixy_webhook_2026'; // Default in route.ts

    console.log(`--- Updating Subscription for WABA: ${wabaId} ---`);
    console.log(`New URL: ${productionUrl}`);
    console.log(`Verify Token: ${verifyToken}`);

    const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscribed_fields: ['messages', 'smb_message_echoes', 'message_deliveries', 'message_reads'],
                override_callback_uri: productionUrl,
                verify_token: verifyToken
            })
        });

        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));

        if (data.success) {
            console.log("\n✅ SUCCESS! WABA is now pointing to production.");
        } else {
            console.log("\n❌ FAILED to update subscription.");
        }
    } catch (e) {
        console.error("Error updating subscription:", e);
    }
}

fixSubscription();
