const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDuplicatesToday() {
    console.log('--- Audit Duplicates (Today) ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all invoices created today
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, client_id, created_at, items, client:clients(name)')
        .gte('created_at', today.toISOString())
        .order('client_id');

    console.log(`Found ${invoices.length} invoices created today.`);

    // Group by Client
    const valMap = {}; // Key: client_id + total + description?

    invoices.forEach(inv => {
        const desc = inv.items && inv.items[0] ? inv.items[0].description : 'Unknown';
        const key = `${inv.client_id}|${inv.total}|${desc}`;

        if (!valMap[key]) valMap[key] = [];
        valMap[key].push(inv);
    });

    let dupesFound = 0;

    Object.keys(valMap).forEach(key => {
        const group = valMap[key];
        if (group.length > 1) {
            const first = group[0];
            console.log(`\n[DUPLICATE GROUP] ${first.client?.name}`);
            console.log(`  Item: ${first.items[0].description} ($${first.total})`);
            console.log(`  Count: ${group.length}`);

            group.forEach(g => {
                console.log(`    - ${g.number} (${g.created_at}) ID: ${g.id}`);
            });
            dupesFound += group.length - 1;
        }
    });

    console.log(`\nTotal Excess Invoices to Delete: ${dupesFound}`);
}

auditDuplicatesToday();
