
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- 🕵️ FB/IG CONNECTIVITY AUDIT ---");
    try {
        const { data: conn } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').order('created_at', { ascending: false }).limit(1).single();
        if (!conn) { console.log("❌ No meta_business connection found."); return; }

        const userToken = conn.credentials.access_token;
        console.log("✅ User Token Found.");

        // 1. Check FB Pages
        const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?access_token=${userToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        console.log("\n--- 📄 CONNECTED PAGES ---");
        if (pagesData.data) {
            for (const page of pagesData.data) {
                console.log(`- Page: ${page.name} (ID: ${page.id})`);
                console.log(`  Tasks: ${page.tasks.join(', ')}`);

                // Check Page Webhook Subscription
                const subUrl = `https://graph.facebook.com/v22.0/${page.id}/subscribed_apps?access_token=${page.access_token}`;
                const subRes = await fetch(subUrl);
                const subData = await subRes.json();
                console.log(`  Subscriptions: ${JSON.stringify(subData.data || [])}`);

                // Check Instagram
                const igUrl = `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
                const igRes = await fetch(igUrl);
                const igData = await igRes.json();
                if (igData.instagram_business_account) {
                    console.log(`  📸 Linked Instagram ID: ${igData.instagram_business_account.id}`);
                } else {
                    console.log(`  📸 No Instagram linked to this page.`);
                }
            }
        } else {
            console.log("❌ No FB Pages found in token scope.");
        }

    } catch (err) {
        console.error("🔥 AUDIT FAILED:", err.message);
    }
}
run();
