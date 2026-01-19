
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- 🕵️ DEEP STATUS AUDIT ---");
    const { data: conn } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').order('created_at', { ascending: false }).limit(1).single();
    if (!conn) return;

    const accessToken = conn.credentials.access_token;
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;

    // 1. Check App Status (Live/Dev)
    const appUrl = `https://graph.facebook.com/v22.0/${appId}?fields=status,name&access_token=${accessToken}`;
    const appRes = await fetch(appUrl);
    const appData = await appRes.json();
    console.log("\n📲 APP STATUS:");
    console.log(JSON.stringify(appData, null, 2));

    // 2. Check WABA & Numbers
    const assets = conn.metadata?.assets_preview || [];
    let wabaId = assets.find(a => a.waba_id)?.waba_id || assets.find(a => a.type === 'whatsapp_waba')?.id;

    const numUrl = `https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?fields=display_phone_number,status,code_verification_status,quality_rating,name_status&access_token=${accessToken}`;
    const numRes = await fetch(numUrl);
    const numData = await numRes.json();

    console.log("\n📞 PHONE NUMBERS DETAIL:");
    console.log(JSON.stringify(numData, null, 2));
}
run();
