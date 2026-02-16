const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOlgaDebug() {
    console.log('--- AUDIT: Olga Liliana (DEBUG) ---');

    // 1. Find Client
    const { data: client } = await supabase.from('clients').select('id, name').ilike('name', '%Olga Liliana%').single();
    if (!client) return console.log('Client not found');
    console.log(`Client Found: ${client.id}`);

    // 2. Get Invoices Today FIRST
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, billing_cycle_id, items, due_date')
        .eq('client_id', client.id)
        .gte('created_at', today.toISOString());

    console.log(`\nInvoices Generated Today (${invoices.length}):`);
    for (const i of invoices) {
        console.log(`  Inv: ${i.number} | $${i.total}`);
        console.log(`    Created: ${i.created_at}`);
        console.log(`    Item: ${i.items[0]?.description}`);

        if (i.billing_cycle_id) {
            const { data: cycle } = await supabase
                .from('billing_cycles')
                .select('metadata, start_date, end_date')
                .eq('id', i.billing_cycle_id)
                .single();
            console.log(`    Cycle META: ${JSON.stringify(cycle?.metadata)}`);
            console.log(`    Cycle DATES: ${cycle?.start_date} -> ${cycle?.end_date}`);
        } else {
            console.log('    [NO CYCLE LINKED]');
        }
    }
}

auditOlgaDebug();
