const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditFrequencyErrors() {
    console.log('--- Audit Frequency Errors (Today) ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get Invoices Created Today
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, client_id, created_at, items, client:clients(name)')
        .gte('created_at', today.toISOString());

    console.log(`Analyzing ${invoices.length} invoices generated today...`);

    // 2. Map Invoices to Services to check Frequency
    const errors = [];

    for (const inv of invoices) {
        // Find Service matching item description + client
        // (Heuristic match since invoice -> service link is via cycle)
        const itemName = inv.items[0]?.description;

        const { data: service } = await supabase
            .from('services')
            .select('id, name, frequency, next_billing_date')
            .eq('client_id', inv.client_id)
            .ilike('name', itemName) // Exact match preferred?
            .maybeSingle();

        if (service) {
            if (service.frequency !== 'monthly') {
                errors.push({
                    client: inv.client?.name,
                    service: service.name,
                    frequency: service.frequency,
                    invoice: inv.number,
                    amount: inv.total,
                    created_at: inv.created_at
                });
            }
        }
    }

    // Report
    console.log(`\nFound ${errors.length} POTENTIALLY INCORRECT invoices (Non-Monthly Frequency):`);

    // Group by Service
    const grouped = {};
    errors.forEach(e => {
        const key = `${e.client} - ${e.service} (${e.frequency})`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(e);
    });

    Object.keys(grouped).forEach(k => {
        console.log(`\n[${k}]`);
        console.log(`  Count: ${grouped[k].length} invoices`);
        grouped[k].forEach(i => console.log(`  - ${i.invoice} ($${i.amount})`));
    });
}

auditFrequencyErrors();
