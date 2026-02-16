const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listClients() {
    console.log('--- Dumping Clients to JSON ---');

    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

    if (error) {
        console.error(error);
        return;
    }

    fs.writeFileSync('clients.json', JSON.stringify(clients, null, 2));
    console.log(`Dumped ${clients.length} clients to clients.json`);
}

listClients();
