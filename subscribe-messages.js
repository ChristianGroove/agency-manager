
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- 🔄 SUBSCRIBING TO MESSAGES FIELD ---");
    const { data: conn } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').order('created_at', { ascending: false }).limit(1).single();
    if (!conn) return;

    const assets = conn.metadata?.assets_preview || [];
    let wabaId = assets.find(a => a.waba_id)?.waba_id || assets.find(a => a.type === 'whatsapp_waba')?.id;

    // Using v22.0 as per previous calls
    const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${conn.credentials.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subscribed_fields: ['messages'],
            override_callback_uri: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/messaging',
            verify_token: 'antigravity_verification_token_2026'
        })
    });

    const data = await res.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));

    if (data.success) {
        console.log("✅ SUCCESSFULLY SUBSCRIBED TO 'messages' FIELD!");
    } else {
        console.log("❌ FAILED TO SUBSCRIBE.");
    }
}
run();
