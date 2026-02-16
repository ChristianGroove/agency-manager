const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOliverAllServices() {
    console.log('--- AUDIT: Oliver ALL Services ---');
    const { data: client } = await supabase.from('clients').select('id, name').ilike('name', '%Orlando Melo%').single();
    if (!client) return console.log('Client not found');

    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', client.id);

    console.log(`Found ${services.length} services.`);
    services.forEach(s => {
        console.log(`Service: ${s.name} ($${s.amount})`);
        console.log(`  ID: ${s.id}`);
        console.log(`  Status: ${s.status}`);
        console.log(`  Freq: ${s.frequency}`);
        console.log(`  Next Bill: ${s.next_billing_date}`);
        console.log('---');
    });
}

auditOliverAllServices();
