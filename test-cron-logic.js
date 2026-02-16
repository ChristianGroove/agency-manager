const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runCronLogic() {
    console.log('--- Starting Cron Logic Simulation ---');
    const today = new Date(); // Use strict 'today' for comparison

    // 1. Get Due Subscriptions
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('next_billing_date', today.toISOString());

    if (error) {
        console.error('Error fetching subs:', error);
        return;
    }

    console.log(`Found ${subscriptions.length} due subscriptions.`);

    for (const sub of subscriptions) {
        console.log(`Processing Sub: ${sub.id} (${sub.name}) - Due: ${sub.next_billing_date}`);

        try {
            // Get Client
            const { data: client } = await supabase.from('clients').select('id, name, email').eq('id', sub.client_id).single();
            if (!client) {
                console.error(`Client not found for sub ${sub.id}`);
                continue;
            }

            // SMART CHECK
            const { data: existing } = await supabase
                .from('invoices')
                .select('id')
                .eq('client_id', sub.client_id)
                .eq('total', sub.amount)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .maybeSingle();

            if (existing) {
                console.log(`[SKIP] Duplicate invoice found: ${existing.id}`);
                continue;
            }

            // Generate Invoice
            console.log(`[GENERATE] Creating invoice for ${sub.amount}...`);
            const invoiceData = {
                client_id: sub.client_id,
                organization_id: sub.organization_id,
                total: sub.amount,
                status: 'pending',
                due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days due
                items: [{
                    description: `${sub.name} (Service)`, // Simplified description
                    quantity: 1,
                    price: sub.amount
                }],
                number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
            };

            const { data: inv, error: invErr } = await supabase.from('invoices').insert(invoiceData).select().single();

            if (invErr) {
                console.error(`Status: FAILED to insert invoice: ${invErr.message}`);
            } else {
                console.log(`Status: SUCCESS Invoice ${inv.id} created.`);

                // Update Subscription Date
                const currentBillingDate = new Date(sub.next_billing_date);
                let nextDate = new Date(currentBillingDate);
                if (sub.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                else nextDate.setDate(nextDate.getDate() + 30); // Fallback

                console.log(`Updating next_billing_date to: ${nextDate.toISOString()}`);
                await supabase.from('subscriptions').update({ next_billing_date: nextDate.toISOString() }).eq('id', sub.id);
            }

        } catch (e) {
            console.error('Error processing sub:', e);
        }
    }
}

runCronLogic();
