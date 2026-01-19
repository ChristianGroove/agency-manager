
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: conn } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').order('created_at', { ascending: false }).limit(1).single();
    if (!conn) return;

    const assets = conn.metadata?.assets_preview || [];
    let wabaId = assets.find(a => a.waba_id)?.waba_id || assets.find(a => a.type === 'whatsapp_waba')?.id;

    // Dump EVERYTHING for phone_numbers
    const url = `https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?access_token=${conn.credentials.access_token}`;
    const res = await fetch(url);
    const data = await res.json();

    console.log("--- 📱 FULL PHONE NUMBER OBJECT ---");
    console.log(JSON.stringify(data, null, 2));
}
run();
