const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDannicel320() {
    console.log('--- AUDIT: Dannicel (Oliver) 320k ---');

    // 1. Find Client "Dannicel" or "Oliver"
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .or('name.ilike.%Dannicel%,name.ilike.%Oliver%');

    console.log(`Found ${clients.length} clients.`);

    for (const c of clients) {
        console.log(`\nClient: ${c.name} (${c.id})`);

        // 2. Find Invoices approx 320.000
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, number, total, status, date, items')
            .eq('client_id', c.id)
            .gte('total', 319000)
            .lte('total', 321000); // Range to be safe

        if (invoices && invoices.length > 0) {
            console.log(`  Found ${invoices.length} invoices ~320k:`);
            invoices.forEach(i => {
                console.log(`    - ${i.number} | $${i.total} | ${i.date.split('T')[0]}`);
                console.log(`      Items: ${JSON.stringify(i.items)}`);
                console.log(`      ID: ${i.id}`);
            });
        } else {
            console.log('  No invoices found around 320k.');
        }
    }
}

auditDannicel320();
