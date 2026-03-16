
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    console.log('Fetching active WhatsApp connections...');
    const { data: connections, error } = await supabase
        .from('integration_connections')
        .select('*')
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching connections:', error);
        return;
    }

    if (!connections || connections.length === 0) {
        console.log('No active WhatsApp connections found.');
        return;
    }

    console.log(`Found ${connections.length} connections.`);
    connections.forEach((conn, i) => {
        console.log(`--- Connection ${i+1} ---`);
        console.log(`ID: ${conn.id}`);
        console.log(`Provider: ${conn.provider_key}`);
        console.log(`Name: ${conn.connection_name}`);
        console.log(`Metadata: ${JSON.stringify(conn.metadata, null, 2)}`);
        // Note: credentials are encrypted in DB, but we can see if they exist
        console.log(`Has Credentials: ${!!conn.credentials}`);
    });
}

checkConnection();
