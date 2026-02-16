const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOliverSimple() {
    console.log('--- AUDIT: Oliver Simple ---');
    const { data: client } = await supabase.from('clients').select('id, name').ilike('name', '%Orlando Melo%').single();
    if (!client) return console.log('Client not found');

    const { data: services } = await supabase
        .from('services')
        .select('id, name, frequency, amount, status')
        .eq('client_id', client.id);

    console.log(`Found ${services.length} services for ${client.name}:`);
    services.forEach(s => {
        console.log(`[${s.status}] ${s.name} | Freq: ${s.frequency} | $${s.amount} | ID: ${s.id}`);
    });
}

auditOliverSimple();
