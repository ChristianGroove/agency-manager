const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOliverRecent() {
    console.log('--- AUDIT: Oliver Recent Invoices ---');

    // 1. Find Client
    const { data: client } = await supabase.from('clients').select('id, name').ilike('name', '%Orlando Melo%').single();
    if (!client) return console.log('Client not found');
    console.log(`Client: ${client.name} (${client.id})`);

    // 2. Get Invoices Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, date, billing_cycle_id, items, due_date')
        .eq('client_id', client.id)
        .gte('created_at', today.toISOString());

    console.log(`\nInvoices Generated Today (${invoices.length}):`);
    invoices.forEach(i => {
        console.log(`  Inv: ${i.number} | Date: ${i.date} | Due: ${i.due_date} | Total: ${i.total}`);
        console.log(`    Item: ${i.items[0]?.description}`);
        console.log(`    Cycle ID: ${i.billing_cycle_id}`);
    });
}

auditOliverRecent();
