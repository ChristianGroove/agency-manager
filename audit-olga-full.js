const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOlgaFull() {
    console.log('--- AUDIT: Olga Liliana (FULL) ---');

    // 1. Find ALL clients matching name
    const { data: clients } = await supabase.from('clients').select('id, name').ilike('name', '%Olga%');
    console.log(`Found ${clients.length} clients matching "Olga".`);
    clients.forEach(c => console.log(`  - ${c.name} (${c.id})`));

    // 2. Search for the SPECIFIC INVOICE NUMBER from Screenshot
    // Partial search just in case
    const targetInv = 'INV-1771129729667';
    console.log(`\nSearching for invoice like ${targetInv}...`);

    const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .ilike('number', `%${targetInv}%`)
        .maybeSingle(); // or .select()

    if (inv) {
        console.log(`FOUND INVOICE!`);
        console.log(`  ID: ${inv.id}`);
        console.log(`  Number: ${inv.number}`);
        console.log(`  Client ID: ${inv.client_id}`);
        console.log(`  Total: ${inv.total}`);
        console.log(`  Created At: ${inv.created_at}`);
        console.log(`  Billing Cycle: ${inv.billing_cycle_id}`);

        // Get Cycle Meta
        if (inv.billing_cycle_id) {
            const { data: cycle } = await supabase.from('billing_cycles').select('*').eq('id', inv.billing_cycle_id).single();
            console.log(`  Cycle Meta: ${JSON.stringify(cycle?.metadata)}`);
        }
    } else {
        console.log('Invoice NOT found by number.');
    }
}

auditOlgaFull();
