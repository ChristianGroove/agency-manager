const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteDuplicatesToday() {
    console.log('--- Deleting Duplicates (Today) ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all invoices created today
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, client_id, created_at, billing_cycle_id, items, client:clients(name)')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true }); // Oldest first (Keep first)

    // Group
    const valMap = {};
    invoices.forEach(inv => {
        const desc = inv.items && inv.items[0] ? inv.items[0].description : 'Unknown';
        // Key includes PRICE and DESCRIPTION to safely group same-service dupes
        const key = `${inv.client_id}|${inv.total}|${desc}`;
        if (!valMap[key]) valMap[key] = [];
        valMap[key].push(inv);
    });

    let deletedCount = 0;

    for (const key of Object.keys(valMap)) {
        const group = valMap[key];
        if (group.length > 1) {
            console.log(`\nProcessing Group: ${group[0].items[0].description}`);

            // Keep FIRST (group[0]), Delete REST
            const toKeep = group[0];
            const toDelete = group.slice(1);

            console.log(`  Keeping: ${toKeep.number}`);

            for (const d of toDelete) {
                console.log(`  Deleting: ${d.number} (${d.id})`);

                // 1. Delete Cycle if exists
                if (d.billing_cycle_id) {
                    await supabase.from('billing_cycles').delete().eq('id', d.billing_cycle_id);
                }
                // 2. Delete Invoice
                await supabase.from('invoices').delete().eq('id', d.id);

                deletedCount++;
            }
        }
    }

    console.log(`\nTotal Invoices Deleted: ${deletedCount}`);
}

deleteDuplicatesToday();
