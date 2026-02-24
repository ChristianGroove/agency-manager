
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConnection() {
    console.log("--- Checking Production WhatsApp Connection ---");
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
        console.log(`- Provider: ${conn.provider_key}`);
        console.log(`- Metadata:`, JSON.stringify(conn.metadata, null, 2));
        console.log(`- Credentials Preview:`, JSON.stringify(conn.credentials).substring(0, 100) + "...");

        // Check if credentials are encrypted
        const isEncrypted = conn.credentials && conn.credentials._encrypted;
        console.log(`- Encrypted: ${!!isEncrypted}`);
    }
}

checkConnection();
