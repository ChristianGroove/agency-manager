const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillGlobal() {
    console.log('--- Backfilling Global Billing Cycles (2026) ---');

    // 1. Get Missing Cycle Invoices
    const start2026 = '2026-01-01T00:00:00.000Z';
    // Get ALL invoices first
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client_id, due_date')
        .gte('created_at', start2026)
        .order('created_at', { ascending: false });

    if (error) return console.error('Error fetching invoices:', error);

    // Get ALL cycles to filter
    const { data: cycles } = await supabase
        .from('billing_cycles')
        .select('invoice_id')
        .gte('start_date', '2025-12-01')
        .not('invoice_id', 'is', null);

    const existingMap = new Set(cycles.map(c => c.invoice_id));
    const toBackfill = invoices.filter(inv => !existingMap.has(inv.id));

    console.log(`Found ${toBackfill.length} invoices needing backfill.`);

    // 2. Fetch ALL Active Services for lookup (to avoid N+1 queries if possible, but N is small)
    // Actually, distinct client_ids from toBackfill
    const clientIds = [...new Set(toBackfill.map(i => i.client_id))];
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .in('client_id', clientIds)
        .eq('status', 'active'); // Or should we include cancelled? ACTIVE for now.

    if (!services) return console.log('No services found.');

    console.log(`Loaded ${services.length} services for matching.`);

    let fixedCount = 0;

    for (const inv of toBackfill) {
        // Attempt Match
        // Filter services for this client
        const clientServices = services.filter(s => s.client_id === inv.client_id);

        // Find service with matching amount
        let match = clientServices.find(s => s.amount === inv.total);

        // Fallback: If no strict amount match, maybe it's a legacy price?
        // If client only has 1 service, assume it's that one.
        if (!match && clientServices.length === 1) {
            match = clientServices[0];
        }

        if (match) {
            console.log(`[FIX] Invoice ${inv.number} ($${inv.total}) -> Service ${match.name}`);

            // Calc Dates
            const endDate = new Date(inv.created_at);
            const startDate = new Date(endDate);

            // Use service frequency if possible, else default monthly
            switch (match.frequency) {
                case 'biweekly': startDate.setDate(startDate.getDate() - 15); break;
                case 'quarterly': startDate.setMonth(startDate.getMonth() - 3); break;
                case 'yearly': startDate.setFullYear(startDate.getFullYear() - 1); break;
                default: startDate.setMonth(startDate.getMonth() - 1); // Monthly default
            }

            const cycleData = {
                service_id: match.id,
                invoice_id: inv.id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                due_date: inv.due_date || endDate.toISOString(),
                amount: inv.total,
                status: 'invoiced',
                metadata: { auto_backfilled: true }
            };

            const { error: insErr, data: newCycle } = await supabase.from('billing_cycles').insert(cycleData).select().single();

            if (insErr) {
                console.error(`Failed to insert cycle: ${insErr.message}`);
            } else {
                fixedCount++;
                // Link back
                await supabase.from('invoices').update({ billing_cycle_id: newCycle.id }).eq('id', inv.id);
            }

        } else {
            console.log(`[SKIP] Could not match service for Invoice ${inv.number} (Client: ${inv.client_id})`);
        }
    }

    console.log(`--- Finished. Fixed ${fixedCount} cycles. ---`);
}

backfillGlobal();
