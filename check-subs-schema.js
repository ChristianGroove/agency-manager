const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemaAndData() {
    console.log('--- Checking Schema & Data ---');

    // 1. Check Subscriptions Columns by inserting dummy?
    // Or just check an existing sub
    const { data: sub } = await supabase.from('subscriptions').select('*').limit(1).single();
    if (sub) {
        console.log('Subscription Keys:', Object.keys(sub));
    } else {
        console.log('No subs found to check keys.');
    }

    // 2. Check Client Data
    const { data: client } = await supabase.from('clients').select('id, name, organization_id').ilike('name', '%Liliana Melo%').single();
    if (client) {
        console.log(`Client Found: ${client.name}`);
        console.log(`  Org ID: ${client.organization_id}`);
    } else {
        console.log('Client not found.');
    }
}

checkSchemaAndData();
