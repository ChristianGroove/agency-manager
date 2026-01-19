
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
    console.log("--- 🕵️ APP WEBHOOK AUDIT (PAGE) ---");
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    // Use App Access Token
    const appTokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;
    const appTokenRes = await fetch(appTokenUrl);
    const appTokenData = await appTokenRes.json();
    const appToken = appTokenData.access_token;

    if (!appToken) {
        console.log("❌ Could not get App Access Token.");
        return;
    }

    // Check App Subscriptions
    const subUrl = `https://graph.facebook.com/v22.0/${appId}/subscriptions?access_token=${appToken}`;
    const subRes = await fetch(subUrl);
    const subData = await subRes.json();

    console.log(JSON.stringify(subData, null, 2));
}
run();
