const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function manualBillingCatchUp() {
    console.log('--- MANUAL BILLING CATCH-UP (Global) ---');
    const today = new Date();

    // 1. Get Due Subscriptions
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('next_billing_date', today.toISOString());

    if (error) return console.error('Error fetching subscriptions:', error);
    console.log(`Found ${subscriptions.length} subscriptions due for billing.`);

    for (const subscription of subscriptions) {
        console.log(`\nProcessing: ${subscription.name} (Client: ${subscription.client_id})`);
        console.log(`  Due Date: ${subscription.next_billing_date}`);

        // EMULATE CRON LOGIC (Corrected Version)

        // 1. Check if invoice already exists for this period?
        // The duplicate check in route.ts uses (client_id + amount + created_at > 24h).
        // Here we should be careful.
        // We will generate the invoice and update next_billing_date.

        const currentBillingDate = new Date(subscription.next_billing_date);
        let nextBillingDate = new Date(currentBillingDate);
        let dueDate = new Date(currentBillingDate); // Due date is usually billing date or + X days

        // Calc Next Date
        switch (subscription.frequency) {
            case 'biweekly': nextBillingDate.setDate(nextBillingDate.getDate() + 15); break;
            case 'monthly': nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); break;
            case 'quarterly': nextBillingDate.setMonth(nextBillingDate.getMonth() + 3); break;
            case 'yearly': nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1); break;
            // One-time logic omitted for recurrals
        }

        // Sanity Check: If nextBillingDate is STILL in the past?
        // e.g. Due Jan 14. Next = Feb 14 (Today).
        // Then we generate Jan 14 invoice.
        // Then loop again? 
        // For safety, let's just generate ONE invoice per run, or loop here.
        // Let's loop limited times (catch up multiple months).

        let pendingDate = new Date(subscription.next_billing_date);
        let safetyCounter = 0;

        while (pendingDate <= today && safetyCounter < 3) {
            console.log(`    >> Generating Invoice for date: ${pendingDate.toISOString().split('T')[0]}`);

            // Generate Invoice
            const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
            const invoiceNumber = `INV-${Date.now()}-${randomSuffix}`;

            // Cycle Dates
            const cycleEnd = new Date(pendingDate);
            const cycleStart = new Date(cycleEnd);
            switch (subscription.frequency) {
                case 'monthly': cycleStart.setMonth(cycleStart.getMonth() - 1); break;
                // ... others
                default: cycleStart.setMonth(cycleStart.getMonth() - 1);
            }

            // Insert Invoice
            const { data: invoice, error: invErr } = await supabase
                .from('invoices')
                .insert({
                    organization_id: subscription.organization_id,
                    client_id: subscription.client_id,
                    number: invoiceNumber,
                    date: new Date().toISOString(), // Created NOW
                    due_date: pendingDate.toISOString(), // Due on the scheduled date
                    items: [{
                        description: subscription.name,
                        quantity: 1,
                        price: subscription.amount
                    }],
                    total: subscription.amount,
                    status: 'pending',
                    document_type: 'CUENTA_DE_COBRO'
                })
                .select()
                .single();

            if (invErr) {
                console.error('    [Error] Creating invoice:', invErr.message);
                break;
            }

            // Create Billing Cycle
            const { data: cycle } = await supabase
                .from('billing_cycles')
                .insert({
                    service_id: null, // Need to find service!
                    invoice_id: invoice.id,
                    start_date: cycleStart.toISOString(),
                    end_date: cycleEnd.toISOString(),
                    amount: subscription.amount,
                    status: 'invoiced',
                    metadata: { source: 'manual_catch_up' }
                })
                .select()
                .single();

            // Link Service (Heuristic)
            const { data: service } = await supabase
                .from('services')
                .select('id')
                .eq('client_id', subscription.client_id)
                .eq('name', subscription.name)
                .maybeSingle();

            if (service && cycle) {
                await supabase.from('billing_cycles').update({ service_id: service.id }).eq('id', cycle.id);
                await supabase.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
                // Update Service Next Date
                // Advancing service date
                let nextServiceDate = new Date(pendingDate);
                nextServiceDate.setMonth(nextServiceDate.getMonth() + 1); // Approx
                await supabase.from('services').update({ next_billing_date: nextServiceDate.toISOString() }).eq('id', service.id);
            }

            // Advance
            pendingDate.setMonth(pendingDate.getMonth() + 1);
            safetyCounter++;
        }

        // Final Update Subscription
        await supabase
            .from('subscriptions')
            .update({ next_billing_date: pendingDate.toISOString() })
            .eq('id', subscription.id);

        console.log(`    >> Subscription updated to: ${pendingDate.toISOString()}`);
    }
}

manualBillingCatchUp();
