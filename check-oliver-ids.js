const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIds() {
    console.log('--- Checking IDs for Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Get Active Services
    const { data: services } = await supabase
        .from('services')
        .select('id, name, amount')
        .eq('client_id', clientId)
        .eq('status', 'active');

    console.log('--- Active Services ---');
    services.forEach(s => console.log(`Service: ${s.name} ($${s.amount}) -> ID: ${s.id}`));

    // 2. Get Recent Invoices (Today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, billing_cycle_id')
        .eq('client_id', clientId)
        .gte('created_at', today.toISOString());

    console.log('\n--- Recent Invoices ---');
    const cycleIds = [];
    invoices.forEach(i => {
        console.log(`Inv: ${i.number} ($${i.total}) -> Cycle: ${i.billing_cycle_id}`);
        if (i.billing_cycle_id) cycleIds.push(i.billing_cycle_id);
    });

    // 3. Get Those Cycles
    if (cycleIds.length > 0) {
        const { data: cycles } = await supabase
            .from('billing_cycles')
            .select('id, service_id, start_date')
            .in('id', cycleIds);

        console.log('\n--- Linked Cycles ---');
        cycles.forEach(c => {
            console.log(`Cycle: ${c.id} -> Service ID: ${c.service_id} (Start: ${c.start_date})`);

            // Check match
            const match = services.find(s => s.id === c.service_id);
            if (match) console.log(`   [MATCH] Linked to: ${match.name}`);
            else console.log(`   [MISMATCH] Service ID not found in Active list!`);
        });
    }
}

checkIds();
