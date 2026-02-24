
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConnection() {
    console.log("--- Checking Production WhatsApp Connection Keys ---");
    const { data: connections, error } = await supabase
        .from('integration_connections')
        .select('*')
        .in('provider_key', ['meta_business', 'whatsapp_cloud', 'meta_whatsapp'])
        .eq('status', 'active');

    if (error) {
        console.error("Error fetching connections:", error);
        return;
    }

    if (!connections || connections.length === 0) {
        console.log("❌ No active WhatsApp connections found.");
        return;
    }

    for (const conn of connections) {
        console.log(`\nConnection [${conn.id}]:`);
        const keys = Object.keys(conn.credentials || {});
        console.log(`- Credential Keys:`, keys);

        // Test Token Validity manually
        const token = conn.credentials.accessToken || conn.credentials.access_token || conn.credentials.apiToken;
        if (token) {
            console.log(`- Testing Token with Meta /me...`);
            try {
                const res = await fetch(`https://graph.facebook.com/v22.0/me?access_token=${token}`);
                const data = await res.json();
                if (res.ok) {
                    console.log(`- ✅ Token is VALID. Name: ${data.name || 'Unknown'}`);
                } else {
                    console.log(`- ❌ Token is INVALID!`, data.error?.message);
                }
            } catch (e) {
                console.error("- ❌ Network/Fetch Error:", e.message);
            }
        }
    }
}

checkConnection();
