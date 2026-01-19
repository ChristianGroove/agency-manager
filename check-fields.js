
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- 🕵️ CHECKING SUBSCRIPTION FIELDS ---");
    const { data: conn } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').order('created_at', { ascending: false }).limit(1).single();
    if (!conn) {
        console.log("❌ No connection found");
        return;
    }

    const assets = conn.metadata?.assets_preview || [];
    let wabaId = assets.find(a => a.waba_id)?.waba_id || assets.find(a => a.type === 'whatsapp_waba')?.id;

    console.log(`WABA ID: ${wabaId}`);

    const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps?access_token=${conn.credentials.access_token}`;
    const res = await fetch(url);
    const data = await res.json();

    console.log("RAW RESPONSE:", JSON.stringify(data, null, 2));

    if (data.data && data.data.length > 0) {
        const sub = data.data[0];
        console.log(`\n✅ Subscribed to App: ${sub.name} (${sub.id})`);
        console.log(`📝 Fields: ${JSON.stringify(sub.subscribed_fields || [])}`);
    } else {
        console.log("\n❌ NO SUBSCRIPTION FOUND for this WABA.");
    }
}
run();
