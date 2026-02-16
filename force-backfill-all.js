const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBackfillAll() {
    console.log('--- FORCE Backfill All Billing Cycles (2026) ---');

    // 1. Get Invoices needing backfill
    const start2026 = '2026-01-01T00:00:00.000Z';
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client_id, due_date')
        .gte('created_at', start2026)
        .order('created_at', { ascending: false });

    if (error) return console.error('Error fetching invoices:', error);

    // Filter out existing cycles
    const { data: cycles } = await supabase
        .from('billing_cycles')
        .select('invoice_id')
        .gte('start_date', '2025-12-01') // Generous
        .not('invoice_id', 'is', null);

    const existingMap = new Set(cycles.map(c => c.invoice_id));
    const toBackfill = invoices.filter(inv => !existingMap.has(inv.id));

    console.log(`Found ${toBackfill.length} invoices to backfill.`);

    if (toBackfill.length === 0) return;

    // 2. Fetch ALL Services (Active AND Cancelled) for relevant clients
    const clientIds = [...new Set(toBackfill.map(i => i.client_id))];
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .in('client_id', clientIds);
    // Removed .eq('status', 'active') to include cancelled ones

    if (!services) return console.log('No services found.');

    let fixedCount = 0;

    for (const inv of toBackfill) {
        // MATCHING STRATEGY
        const clientServices = services.filter(s => s.client_id === inv.client_id);

        let match = null;
        let matchType = '';

        // Strategy A: Exact Amount (Active)
        match = clientServices.find(s => s.amount === inv.total && s.status === 'active');
        if (match) matchType = 'EXACT_ACTIVE';

        // Strategy B: Exact Amount (Any Status)
        if (!match) {
            match = clientServices.find(s => s.amount === inv.total);
            if (match) matchType = 'EXACT_ANY';
        }

        // Strategy C: Fallback to ANY Active Service (if only one exists, or pick first)
        // This is risky but better than nothing for "General" invoices?
        // Maybe try to match Name?
        if (!match) {
            // Try fuzzy name match? No, too hard with JS only.
            // If client has exactly 1 active service, attach to it.
            const activeServices = clientServices.filter(s => s.status === 'active');
            if (activeServices.length >= 1) {
                match = activeServices[0];
                matchType = 'FALLBACK_ACTIVE';
            }
        }

        // Strategy D: Fallback to ANY Service
        if (!match && clientServices.length > 0) {
            match = clientServices[0];
            matchType = 'FALLBACK_ANY';
        }

        if (match) {
            console.log(`[FIX] Invoice ${inv.number} ($${inv.total}) -> Service ${match.name} [${matchType}]`);

            // Calc Dates
            const endDate = new Date(inv.created_at);
            const startDate = new Date(endDate);

            switch (match.frequency) {
                case 'biweekly': startDate.setDate(startDate.getDate() - 15); break;
                case 'quarterly': startDate.setMonth(startDate.getMonth() - 3); break;
                case 'yearly': startDate.setFullYear(startDate.getFullYear() - 1); break;
                default: startDate.setMonth(startDate.getMonth() - 1);
            }

            const cycleData = {
                service_id: match.id,
                invoice_id: inv.id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                due_date: inv.due_date || endDate.toISOString(),
                amount: inv.total,
                status: 'invoiced',
                metadata: { auto_backfilled: true, match_type: matchType }
            };

            const { error: insErr, data: newCycle } = await supabase.from('billing_cycles').insert(cycleData).select().single();

            if (insErr) {
                console.error(`Failed to insert cycle: ${insErr.message}`);
            } else {
                fixedCount++;
                await supabase.from('invoices').update({ billing_cycle_id: newCycle.id }).eq('id', inv.id);
            }

        } else {
            console.log(`[SKIP] No service found for Invoice ${inv.number} (Client: ${inv.client_id})`);
        }
    }

    console.log(`--- Finished. Fixed ${fixedCount} cycles. ---`);
}

forceBackfillAll();
