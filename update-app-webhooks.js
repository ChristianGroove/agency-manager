
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
    console.log("--- 🔄 UPDATING APP WEBHOOK URL ---");
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const newUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/messaging';

    // Get App Token
    const appTokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;
    const appTokenRes = await fetch(appTokenUrl);
    const appTokenData = await appTokenRes.json();
    const appToken = appTokenData.access_token;

    if (!appToken) { console.log("❌ No App Token"); return; }

    const objects = ['page', 'instagram'];

    for (const obj of objects) {
        console.log(`\n📦 Updating ${obj}...`);
        const subUrl = `https://graph.facebook.com/v22.0/${appId}/subscriptions`;
        const subRes = await fetch(subUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: appToken,
                object: obj,
                callback_url: newUrl,
                verify_token: 'antigravity_verification_token_2026',
                fields: obj === 'page' ? 'messages,messaging_postbacks,messaging_optins,message_reads,message_deliveries' : 'messages,comments'
            })
        });
        const subData = await subRes.json();

        if (subData.success) {
            console.log(`✅ SUCCESS: ${obj} webhook updated to ${newUrl}`);
        } else {
            console.log(`❌ FAILED for ${obj}:`, JSON.stringify(subData, null, 2));
        }
    }
}
run();
