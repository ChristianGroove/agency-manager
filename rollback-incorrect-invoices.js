const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function rollbackIncorrectInvoices() {
    console.log('--- Rollback Incorrect Invoices (Frequency Mismatch) ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Audit Again to Get List (Since prev output truncated)
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, client_id, created_at, billing_cycle_id, items, client:clients(name)')
        .gte('created_at', today.toISOString());

    let deletedCount = 0;

    for (const inv of invoices) {
        const itemName = inv.items[0]?.description;

        const { data: service } = await supabase
            .from('services')
            .select('id, name, frequency, service_start_date, next_billing_date')
            .eq('client_id', inv.client_id)
            .ilike('name', itemName)
            .maybeSingle();

        if (service && service.frequency !== 'monthly') {
            console.log(`\n[ROLLBACK TARGET] ${inv.client?.name} - ${service.name} (${service.frequency})`);
            console.log(`  Invoice: ${inv.number} ($${inv.total})`);

            // DELETE Invoice & Cycle
            if (inv.billing_cycle_id) {
                await supabase.from('billing_cycles').delete().eq('id', inv.billing_cycle_id);
            }
            await supabase.from('invoices').delete().eq('id', inv.id);
            deletedCount++;
            console.log('  [DELETED] Invoice and Cycle removed.');

            // RESET DATE
            // We need to restore the date based on start date + frequency logic?
            // Or just revert to what it was?
            // We don't know what it WAS.
            // But we know if it is Yearly starting July 2024, next bill is July 2025.
            // If today is Feb 2026... wait.
            // Wilmer was "July 2 2025".

            // Heuristic:
            // Calculate correct next billing based on start date.
            if (service.service_start_date) {
                const start = new Date(service.service_start_date);
                // Advance start date until it is AFTER today
                let next = new Date(start);
                while (next <= today) {
                    if (service.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
                    else if (service.frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
                    else if (service.frequency === 'biannual') next.setMonth(next.getMonth() + 6);
                    else next.setMonth(next.getMonth() + 1); // Should not happen here
                }

                console.log(`  [RESET DATE] From ${service.next_billing_date} -> ${next.toISOString()}`);
                await supabase.from('services').update({ next_billing_date: next.toISOString() }).eq('id', service.id);
                // Sync Sub
                await supabase.from('subscriptions').update({ next_billing_date: next.toISOString() }).eq('client_id', inv.client_id).ilike('name', service.name);
            }
        }
    }

    console.log(`\nTotal Rolled Back: ${deletedCount}`);
}

rollbackIncorrectInvoices();
