
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- 🔗 SUBSCRIBING PAGES TO WEBHOOKS ---");
    try {
        const { data: conn } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').order('created_at', { ascending: false }).limit(1).single();
        if (!conn) { console.log("❌ No connection found."); return; }

        const userToken = conn.credentials.access_token;

        // 1. Get Pages and their tokens
        const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?access_token=${userToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (!pagesData.data) {
            console.log("❌ No pages found:", pagesData);
            return;
        }

        for (const page of pagesData.data) {
            console.log(`\n🎯 Processing Page: ${page.name} (${page.id})`);

            // 2. Subscribe Page to App
            const subUrl = `https://graph.facebook.com/v22.0/${page.id}/subscribed_apps`;
            const subRes = await fetch(subUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: page.access_token,
                    subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_reads,message_deliveries'
                })
            });
            const subData = await subRes.json();

            if (subData.success) {
                console.log(`✅ SUCCESS: Subscribed to 'messages' for ${page.name}`);
            } else {
                console.log(`❌ FAILED:`, JSON.stringify(subData, null, 2));
            }

            // 3. Instagram check
            const igUrl = `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
            const igRes = await fetch(igUrl);
            const igData = await igRes.json();
            if (igData.instagram_business_account) {
                console.log(`📸 Found Instagram Account: ${igData.instagram_business_account.id}. Page subscription covers this if App has 'instagram_manage_messages'.`);
            }
        }

    } catch (err) {
        console.error("🔥 ERROR:", err.message);
    }
}
run();
