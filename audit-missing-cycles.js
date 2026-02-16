const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditMissingCycles() {
    console.log('--- Auditing System-Wide Missing Cycles (2026) ---');

    // 1. Get all invoices from 2026
    const start2026 = '2026-01-01T00:00:00.000Z';
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client_id, billing_cycle_id')
        .gte('created_at', start2026)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching invoices:', error);
        return;
    }

    console.log(`Total Invoices in 2026: ${invoices.length}`);

    // 2. Identify those without billing_cycle_id
    // Note: billing_cycle_id column might be null if not linked.
    // Also, we should check if a billing_cycle exists with this invoice_id even if column is null.

    const missingLink = invoices.filter(inv => !inv.billing_cycle_id);
    console.log(`Invoices with null billing_cycle_id: ${missingLink.length}`);

    // Double check: active check against billing_cycles table
    // Fetch all cycles in 2026
    const { data: cycles } = await supabase
        .from('billing_cycles')
        .select('invoice_id')
        .gte('start_date', '2025-12-01') // generous buffer
        .not('invoice_id', 'is', null);

    const cycleInvoiceIds = new Set(cycles.map(c => c.invoice_id));

    const trulyMissing = invoices.filter(inv => !cycleInvoiceIds.has(inv.id));

    console.log(`Actual Invoices missing a Billing Cycle record: ${trulyMissing.length}`);

    if (trulyMissing.length > 0) {
        console.log('Sample missing:', trulyMissing.slice(0, 3).map(i => `${i.number} (${i.total})`));
    }
}

auditMissingCycles();
