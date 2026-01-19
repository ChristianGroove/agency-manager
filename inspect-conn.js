
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: connections, error } = await supabase.from('integration_connections').select('*').eq('provider_key', 'meta_business').eq('status', 'active');
    if (error) { console.error(error); return; }

    console.log(`--- 🔌 META BUSINESS CONNECTIONS (${connections.length}) ---`);
    connections.forEach(conn => {
        console.log(`\nID: ${conn.id}`);
        console.log(`Org: ${conn.organization_id}`);
        console.log(`Metadata: ${JSON.stringify(conn.metadata, null, 2)}`);
        // Note: Credentials are typically encrypted in production, but here we can check schema.
        console.log(`Credentials Keys: ${Object.keys(conn.credentials || {}).join(', ')}`);
    });
}
run();
