const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteLilianaWrongInvoices() {
    console.log('--- DELETE LILIANA WRONG INVOICES ---');
    const targetNumbers = [
        'INV-1771180277021-VCD', // $1.086k (Consolidated/Wrong)
        'INV-1771129680504-SX6', // $388k (Likely duplicate/zombie)
        'INV-1768494210446-JJ1', // $310k (Mystery)
        'INV-1768494167219-160', // $388k (Old Zombie)
        'INV-1767037133305-16Q'  // $320k (From Screenshot, check this one too)
    ];

    for (const num of targetNumbers) {
        console.log(`Deleting Invoice ${num}...`);

        // Use ilike to handle potential prefix issues
        const { data: invs } = await supabase
            .from('invoices')
            .select('id, number')
            .ilike('number', `%${num.split('-')[1]}%`); // Match by timestamp

        if (invs && invs.length > 0) {
            for (const inv of invs) {
                const { error } = await supabase
                    .from('invoices')
                    .delete()
                    .eq('id', inv.id);

                if (error) console.error(`Error deleting ${inv.number}:`, error);
                else console.log(`Deleted ${inv.number} (${inv.id})`);
            }
        } else {
            console.log(`Invoice ${num} not found.`);
        }
    }
}

async function cancelZombieSubscription() {
    console.log('--- CANCEL ZOMBIE SUBSCRIPTION ---');
    // ID from audit-liliana-subscriptions.js
    const subId = '650aa3ab-539a-442c-ab6c-6f2d76bb24ed'; // Chatender

    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: 'cancelled',
            deleted_at: new Date().toISOString()
        })
        .eq('id', subId);

    if (error) console.error('Error cancelling sub:', error);
    else console.log(`Subscription ${subId} cancelled.`);
}

async function run() {
    await deleteLilianaWrongInvoices();
    await cancelZombieSubscription();
}

run();
