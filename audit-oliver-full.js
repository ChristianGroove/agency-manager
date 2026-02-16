const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOliverFull() {
    console.log('--- AUDIT: Oliver Full (Wider Window) ---');

    // 1. Find Client
    const { data: client } = await supabase.from('clients').select('id, name').ilike('name', '%Orlando Melo%').single();
    if (!client) return console.log('Client not found');
    console.log(`Client: ${client.name}`);

    // 2. Get Recent Invoices (Since Feb 13)
    const checkDate = new Date('2026-02-13T00:00:00Z');

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, date, billing_cycle_id, items')
        .eq('client_id', client.id)
        .gte('created_at', checkDate.toISOString())
        .order('created_at', { ascending: false });

    console.log(`\nFound ${invoices.length} invoices since Feb 13:`);
    invoices.forEach(i => {
        console.log(`  Inv: ${i.number}`);
        console.log(`    Created: ${i.created_at}`);
        console.log(`    Date Field: ${i.date}`);
        console.log(`    Total: ${i.total}`);
        console.log(`    Item: ${i.items[0]?.description}`);
    });
}

auditOliverFull();
