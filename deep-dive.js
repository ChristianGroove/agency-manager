const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('--- Listing Public Tables ---');

    // There isn't a direct "list tables" method in the JS client without RLS/Permissions needed for system catalogs.
    // However, we can try to call a known RPC function if it exists, or just query common tables to confirm existence.
    // A better approach for "discovery" if we can't query information_schema directly via JS client (often blocked)
    // is to try to select from likely candidates.

    // BUT! inspecting the Schema of `subscriptions` earlier didn't show a foreign key to `services`.

    // Let's try to query 'services' table directly.
    const { data: services, error } = await supabase.from('services').select('*').limit(5);
    if (!error) {
        console.log("Table 'services' EXISTS. Sample:");
        console.log(services);
    } else {
        console.log("Table 'services' check failed:", error.message);
    }

    // Try 'products'
    const { data: products, error: prodError } = await supabase.from('products').select('*').limit(5);
    if (!prodError) {
        console.log("Table 'products' EXISTS.");
    }

    // Try 'items'
    const { data: items, error: itemsError } = await supabase.from('items').select('*').limit(5);
    if (!itemsError) {
        console.log("Table 'items' EXISTS.");
    }

    // Also, let's search `subscriptions` including DELETED ones.
    console.log('\n--- Searching ALL Subscriptions (including deleted) for Oliver ---');
    // Depending on how soft delete is implemented (deleted_at column?)
    const { data: allSubs, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .or('name.ilike.%Growth%,name.ilike.%Design%') // Matching user terms
        .limit(20);

    if (allSubs) {
        console.log(`Found ${allSubs.length} matching subscriptions (deleted or active):`);
        allSubs.forEach(s => {
            console.log(`[${s.id}] ${s.name} - $${s.amount} - Status: ${s.status} - Client: ${s.client_id}`);
        });
    }
}

listTables();
