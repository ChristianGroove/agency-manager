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

async function listAllTables() {
    console.log('--- Listing All Tables (via RPC or manual check) ---');

    // We can't easily list tables with js client standard methods, 
    // but we can try to access `information_schema.tables` if permissions allow.

    const { data, error } = await supabase
        .from('information_schema.tables') // This usually fails with standard client but worth a try if RLS allows
        .select('*')
        .eq('table_schema', 'public');

    if (error) {
        console.log('Direct schema access failed:', error.message);
        console.log('Falling back to checking probable tables...');
        const probable = ['subscriptions', 'services', 'products', 'items', 'service_items', 'subscription_items', 'plans', 'prices'];

        for (const t of probable) {
            const { count, error: tErr } = await supabase.from(t).select('*', { count: 'exact', head: true });
            if (!tErr) console.log(`Table '${t}' EXISTS (Rows: ${count})`);
            else console.log(`Table '${t}' check failed: ${tErr.message}`);
        }
    } else {
        console.log('Tables found:', data.map(t => t.table_name));
    }
}

listAllTables();
