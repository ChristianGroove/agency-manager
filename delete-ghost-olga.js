const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteGhostOlga() {
    console.log('--- DELETE: Ghost Olga Invoice ---');

    // 1. Find Invoice by Number (Exact)
    // INV-1771129729667-7KW (from screenshot, matches partial search)
    const targetInvPartial = 'INV-1771129729667';

    const { data: inv } = await supabase
        .from('invoices')
        .select('id, number, client_id, billing_cycle_id')
        .ilike('number', `%${targetInvPartial}%`)
        .single();

    if (inv) {
        console.log(`Deleting Invoice: ${inv.number}`);
        console.log(`  Client ID: ${inv.client_id}`);

        // 2. Delete Cycle
        if (inv.billing_cycle_id) {
            await supabase.from('billing_cycles').delete().eq('id', inv.billing_cycle_id);
            console.log('  Cycle deleted.');
        }

        // 3. Delete Invoice
        await supabase.from('invoices').delete().eq('id', inv.id);
        console.log('  Invoice deleted.');

        // 4. Check Client Status (Why duplicate?)
        const { data: client } = await supabase.from('clients').select('id, name').eq('id', inv.client_id).single();
        console.log(`  Client Name: ${client?.name}`);

        // Check Services for this client - deactivate them?
        const { data: services } = await supabase.from('services').select('id, name, status').eq('client_id', inv.client_id);
        console.log(`  Services for Ghost Client:`);
        services.forEach(s => {
            console.log(`    - ${s.name} (${s.status})`);
        });

        // Deactivate ghost services?
        // User implied this invoice shouldn't exist.
        // If this is a duplicate client with active services, we should deactivate them.
        if (services.length > 0) {
            console.log('  Deactivating ghost services...');
            await supabase.from('services').update({ status: 'inactive' }).eq('client_id', inv.client_id);
        }

    } else {
        console.log('Invoice not found for deletion.');
    }
}

deleteGhostOlga();
