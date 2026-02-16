const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepDebug() {
    console.log('--- Deep Debug for Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Services
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    console.log(`\n--- Services (${services.length}) ---`);
    services.forEach(s => {
        console.log(`[${s.status}] ID: ${s.id}`);
        console.log(`  Name: ${s.name} ($${s.amount})`);
        console.log(`  Next Bill: ${s.next_billing_date}`);
    });

    // 2. Billing Cycles
    // Gather all service IDs match design
    const serviceIds = services.map(s => s.id);
    const { data: cycles } = await supabase
        .from('billing_cycles')
        .select('*')
        .in('service_id', serviceIds)
        .order('start_date', { ascending: false });

    console.log(`\n--- Billing Cycles (${cycles.length}) ---`);
    cycles.forEach(c => {
        console.log(`[${c.status}] Cycle ID: ${c.id}`);
        console.log(`  Service ID: ${c.service_id}`);
        console.log(`  Period: ${c.start_date} -> ${c.end_date}`);
        console.log(`  Invoice ID: ${c.invoice_id}`);
    });

    // 3. New Invoices (Today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', today.toISOString());

    console.log(`\n--- Today's Invoices (${invoices.length}) ---`);
    invoices.forEach(i => {
        console.log(`Inv: ${i.number} ($${i.total}) CycleID: ${i.billing_cycle_id}`);
    });
}

deepDebug();
