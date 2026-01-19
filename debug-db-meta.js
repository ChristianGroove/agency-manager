
const { createClient } = require('@supabase/supabase-js');

// Init Supabase (Service Role for direct access)
const supabaseUrl = process.env.NEXT_PUBLIC_APP_URL ? 'http://localhost:3000' : 'http://localhost:3000'; // Hack for script
// Wait, I need the URL/Key from env.
// I'll assume they are in .env.local and I can load them or just hardcode for this script if I can read them.
// Better: just read .env.local first.

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConnections() {
    console.log("--- CHECKING CONNECTIONS ---");
    const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('provider_key', 'meta_business')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No Meta connections found.");
        return;
    }

    data.forEach(conn => {
        console.log(`\nConnection ID: ${conn.id}`);
        console.log(`Organization: ${conn.organization_id}`);
        console.log(`Updated At: ${conn.updated_at}`);
        console.log("Metadata Preview:");

        const assets = conn.metadata?.assets_preview || [];
        assets.forEach(asset => {
            console.log(` - [${asset.type}] ${asset.name} (ID: ${asset.id})`);
            if (asset.display_phone_number) {
                console.log(`   Phone: ${asset.display_phone_number}`);
            }
        });
    });
}

checkConnections();
