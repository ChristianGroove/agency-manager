
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- 🔄 UPDATING WEBHOOK URL ---");
    console.log(`New URL: ${process.env.NEXT_PUBLIC_APP_URL}`);

    // 1. Get Connection
    const { data: conn } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').order('created_at', { ascending: false }).limit(1).single();
    if (!conn) { console.log("❌ DB: No connection found."); return; }

    const accessToken = conn.credentials.access_token;

    // 2. Identify WABA
    const assets = conn.metadata?.assets_preview || [];
    let wabaId = assets.find(a => a.waba_id)?.waba_id || assets.find(a => a.type === 'whatsapp_waba')?.id;

    if (!wabaId) { console.log("❌ No WABA ID found."); return; }
    console.log(`🎯 Target WABA: ${wabaId}`);

    // 3. Force Subscribe with NEW URL
    const subUrl = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;
    const subRes = await fetch(subUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            override_callback_uri: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/messaging',
            verify_token: 'antigravity_verification_token_2026'
        })
    });
    const subData = await subRes.json();

    if (subData.success) {
        console.log(`✅ SUCCESS! Webhook updated to: ${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/messaging`);
    } else {
        console.log(`❌ FAILED:`, JSON.stringify(subData, null, 2));
    }
}
run();
