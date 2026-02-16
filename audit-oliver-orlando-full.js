const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOliverOrlandoFull() {
    console.log('--- AUDIT: Oliver vs Orlando ---');

    // 1. Search Clients
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .or('name.ilike.%Oliver%,name.ilike.%Orlando%');

    console.log(`Found ${clients.length} clients.`);

    for (const c of clients) {
        console.log(`\nClient: ${c.name} (${c.id})`);
        const { data: services } = await supabase
            .from('services')
            .select('id, name, status, frequency, next_billing_date, amount')
            .eq('client_id', c.id);

        console.log(`  Services: ${services.length}`);
        services.forEach(s => {
            console.log(`  - [${s.status}] ${s.name} | $${s.amount} | Freq: ${s.frequency} | Next: ${s.next_billing_date}`);
            console.log(`    ID: ${s.id}`);
        });
    }
}

auditOliverOrlandoFull();
