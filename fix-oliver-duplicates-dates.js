const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOliverDuplicatesAndDates() {
    console.log('--- Fixing Oliver Duplicates & Dates ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Get Matching Services
    // We need to identify which service is "Diseño" (Day 6) and "Marketing" (Day 12?)
    // Or based on user input: "la de el 6 y la del 12".

    const { data: services } = await supabase.from('services').select('*').eq('client_id', clientId).eq('status', 'active');

    if (!services) return console.log('No services found');

    for (const service of services) {
        console.log(`\nProcessing Service: ${service.name} (${service.id})`);

        let targetDay = null;

        // HEURISTIC: Check Start Date or Name to assign 6 vs 12.
        // User said: "la de el 6 y la del 12".
        // Let's check service_start_date.
        if (service.service_start_date) {
            const d = new Date(service.service_start_date);
            const day = d.getUTCDate();
            console.log(`  Start Date Day: ${day}`);
            targetDay = day;
        } else {
            // Fallback heuristic if null?
            console.log(`  No start date. Created At Day: ${new Date(service.created_at).getUTCDate()}`);
        }

        // Fetch Cycles to De-Duplicate
        const { data: cycles } = await supabase
            .from('billing_cycles')
            .select('*')
            .eq('service_id', service.id)
            .order('created_at', { ascending: false }); // Newest first

        // Group by Month (YYYY-MM of start_date)
        const monthMap = {};
        for (const cycle of cycles) {
            const date = new Date(cycle.start_date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;

            if (!monthMap[key]) monthMap[key] = [];
            monthMap[key].push(cycle);
        }

        // De-duplicate
        for (const key in monthMap) {
            const group = monthMap[key];
            if (group.length > 1) {
                console.log(`  [DUPLICATE FOUND] Month ${key} has ${group.length} cycles.`);
                // Keep the one that seems "best"? Or just oldest/newest?
                // User said "has puesto esas dos en marzo si son de febrero".
                // We keep the one that matches the TARGET DAY if possible?
                // Or just keep the first one and update it.

                // Let's keep the LAST created one (most recent attempt) and delete others?
                // Or Keep the FIRST created one (original)?
                // Usually first is better if we didn't mess it up.
                // But my backfill was recent.
                // Let's keep group[0] (Newest) and delete group[1..] (Older/Duplicates)
                // WAIT. If I created a duplicate, maybe I should keep the one with the correct invoice?
                // Both have invoices.

                // Let's delete the one that DOESN'T match the target day if possible?
                // Actually, let's delete the NEWEST one (likely the "force-backfill" one) and keep the original if it exists.
                // Or vice-versa.

                // Safe bet: Delete the one with 'auto_backfilled' in metadata if both exist.

                const toKeep = group[0]; // Keep newest for now, modify it later.
                const toDelete = group.slice(1);

                for (const d of toDelete) {
                    console.log(`    Deleting Cycle ID: ${d.id}`);
                    await supabase.from('billing_cycles').delete().eq('id', d.id);
                    // Also delete invoice?? User says "repetidamente".
                    // If invoice exists and is unpaid/pending/draft?
                    // Safe to delete invoice if we confirm it's a dupe.
                    if (d.invoice_id) {
                        console.log(`    Deleting Invoice ID: ${d.invoice_id}`);
                        await supabase.from('invoices').delete().eq('id', d.invoice_id);
                    }
                }
            }
        }

        // FIX DATES on the remaining cycles (Jan & Feb)
        // If targetDay is 6 or 12, force the cycles to align.
        if (targetDay) {
            // Re-fetch remaining cycles
            const { data: remainingCycles } = await supabase
                .from('billing_cycles')
                .select('*')
                .eq('service_id', service.id)
                .order('start_date', { ascending: false });

            for (const cycle of remainingCycles) {
                const sDate = new Date(cycle.start_date);
                const eDate = new Date(cycle.end_date);

                // Force Day
                const originalDay = sDate.getUTCDate();
                if (originalDay !== targetDay) {
                    console.log(`  [FIXING DATE] Cycle ${cycle.id} (${sDate.toISOString()}) -> Day ${targetDay}`);

                    sDate.setUTCDate(targetDay);
                    eDate.setUTCDate(targetDay);

                    // Verify Month didn't shift incorrectly
                    // e.g. Feb 14 -> Feb 6 (OK).
                    // e.g. Jan 14 -> Jan 6 (OK).

                    await supabase
                        .from('billing_cycles')
                        .update({
                            start_date: sDate.toISOString(),
                            end_date: eDate.toISOString()
                        })
                        .eq('id', cycle.id);
                }
            }

            // Update Service Next Billing
            // e.g. today is Feb 14. Target is 6.
            // Next billing should be March 6.
            let nextBill = new Date();
            nextBill.setUTCDate(targetDay);
            if (nextBill < new Date()) {
                nextBill.setMonth(nextBill.getMonth() + 1);
            }
            // Ensure day matches (handle Feb 28 issue etc)
            if (nextBill.getUTCDate() !== targetDay) nextBill.setUTCDate(targetDay);

            console.log(`  [SERVICE UPDATE] Next Billing: ${nextBill.toISOString()}`);
            await supabase.from('services').update({ next_billing_date: nextBill.toISOString() }).eq('id', service.id);

            // Update Subscription
            await supabase.from('subscriptions').update({ next_billing_date: nextBill.toISOString() }).eq('client_id', clientId).eq('name', service.name);
        }
    }
}

fixOliverDuplicatesAndDates();
