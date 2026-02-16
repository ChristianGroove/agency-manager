const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function consolidateBilling() {
    console.log('--- Consolidating Billing for Oliver (Feb Only) ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Get Active Subscriptions
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active');

    if (error || !subscriptions) {
        console.error('Error fetching subs:', error);
        return;
    }

    console.log(`Found ${subscriptions.length} subscriptions. Generating 1 invoice for each.`);

    for (const sub of subscriptions) {
        // Generate Invoice
        const invoiceData = {
            client_id: sub.client_id,
            organization_id: sub.organization_id,
            total: sub.amount,
            status: 'pending', // Pending payment
            date: new Date().toISOString(),
            due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            items: [{
                description: `${sub.name} (Correspondiente a Febrero)`,
                quantity: 1,
                price: sub.amount
            }],
            // Use time-based ID + index to ensure uniqueness if running fast
            number: `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            document_type: 'CUENTA_DE_COBRO'
        };

        const { data: inv, error: invErr } = await supabase.from('invoices').insert(invoiceData).select().single();

        if (invErr) {
            console.error(`FAILED to create invoice for ${sub.name}: ${invErr.message}`);
        } else {
            console.log(`SUCCESS: Invoice ${inv.number} ($${sub.amount}) created for ${sub.name}.`);
        }
    }
}

consolidateBilling();
