const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBillOliver() {
    console.log('--- Force Billing Oliver (Manual Catch-up) ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Get Active Subscriptions
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching subs:', error);
        return;
    }

    console.log(`Found ${subscriptions.length} subscriptions.`);

    for (const sub of subscriptions) {
        console.log(`\nProcessing Sub: ${sub.id} (${sub.name} - ${sub.amount})`);

        try {
            // SMART CHECK (Strict duplicate check for today)
            const { data: existing } = await supabase
                .from('invoices')
                .select('id, number')
                .eq('client_id', sub.client_id)
                .eq('total', sub.amount)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .maybeSingle();

            if (existing) {
                console.log(`[SKIP] Invoice already exists today: ${existing.number}`);
                continue;
            }

            // Generate Invoice
            console.log(`[GENERATE] Creating invoice for ${sub.amount}...`);
            const invoiceData = {
                client_id: sub.client_id,
                organization_id: sub.organization_id,
                total: sub.amount,
                status: 'pending',
                date: new Date().toISOString(), // REQUIRED
                due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                items: [{
                    description: sub.name,
                    quantity: 1,
                    price: sub.amount
                }],
                number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                document_type: 'CUENTA_DE_COBRO'
            };

            const { data: inv, error: invErr } = await supabase.from('invoices').insert(invoiceData).select().single();

            if (invErr) {
                console.error(`FAILED to create invoice: ${invErr.message}`);
            } else {
                console.log(`SUCCESS: Invoice ${inv.number} created.`);

                // Update Subscription Date (Push to next month)
                // We do this to align "next billing" to March, if not already there.
                // But since we are forcing, we should reset it to March 6/13/14 properly.
                // If it is already March, we leave it?
                // Actually, if we bill TODAY (Feb 14), then next should be March 14?
                // Or if original was Feb 6, next is March 6.
                // We'll calculate based on CURRENT Next Billing Date.

                let currentNext = new Date(sub.next_billing_date);
                // If the date is already in March, we don't update it?
                // But we generated an invoice.
                // If we generated an invoice, it means we handled the "Feb" cycle manually.
                // So if date is March, it's correct.
                // If date is Jan/Feb, we update it.

                if (currentNext < new Date()) {
                    let newNext = new Date(currentNext);
                    newNext.setMonth(newNext.getMonth() + 1);
                    console.log(`Updating next_billing_date to: ${newNext.toISOString()}`);
                    await supabase.from('subscriptions').update({ next_billing_date: newNext.toISOString() }).eq('id', sub.id);
                } else {
                    console.log('Next billing date is already in future, leaving as is.');
                }
            }

        } catch (e) {
            console.error('Error processing sub:', e);
        }
    }
}

forceBillOliver();
