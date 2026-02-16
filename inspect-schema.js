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

async function inspectSchema() {
    console.log('--- Inspecting Clients Table ---');

    // Currently, Supabase client doesn't expose a direct schema inspector easily without raw SQL or RPC.
    // But we can just select * from clients limit 1 and see the keys.

    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    if (clients && clients.length > 0) {
        console.log('Keys in clients table:');
        console.log(Object.keys(clients[0]));
        console.log('Sample record:', clients[0]);
    } else {
        console.log('No clients found to inspect.');
    }
}

inspectSchema();
