const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOtherClients() {
    console.log('--- Debugging Other Clients Cycles ---');

    // 1. Get Invoices 2026
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client_id, client:clients(name)')
        .gte('created_at', '2026-01-01')
        .neq('client_id', 'f9989878-a960-4e49-9b10-ecd0998317e5') // Exclude Oliver
        .order('created_at', { ascending: false })
        .limit(20);

    if (!invoices || invoices.length === 0) {
        console.log('No other 2026 invoices found.');
        return;
    }

    console.log(`Found ${invoices.length} recent invoices for other clients.`);

    for (const inv of invoices) {
        // Check if cycle exists
        const { data: cycle } = await supabase
            .from('billing_cycles')
            .select('*')
            .eq('invoice_id', inv.id)
            .maybeSingle();

        const status = cycle ? 'OK' : 'MISSING';
        console.log(`[${status}] Inv ${inv.number} ($${inv.total}) - Client: ${inv.client?.name}`);

        if (!cycle) {
            // Why missing?
            // Check services for this client
            const { data: services } = await supabase
                .from('services')
                .select('id, name, amount')
                .eq('client_id', inv.client_id);

            console.log(`    -> Active Services:`);
            if (services) {
                services.forEach(s => console.log(`       - ${s.name} ($${s.amount})`));
            }
        }
    }
}

debugOtherClients();
