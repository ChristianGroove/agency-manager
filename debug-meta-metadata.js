const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectMetadata() {
    const { data: connections, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('provider_key', 'meta_business');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${connections.length} Meta connections.`);
    connections.forEach(conn => {
        console.log(`\nConnection: ${conn.connection_name} (FULL_ID: ${conn.id})`);
        console.log('Metadata keys:', Object.keys(conn.metadata || {}));
        if (conn.metadata?.selected_assets) {
            console.log('Selected Assets:', JSON.stringify(conn.metadata.selected_assets, null, 2));
        } else {
            console.log('No selected_assets found in metadata.');
        }
    });
}

inspectMetadata();
