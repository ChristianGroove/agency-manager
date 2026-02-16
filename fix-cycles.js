const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCycles() {
    console.log('--- Fixing Billing Cycles for Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Fetch Active Services
    const { data: services, error: sErr } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active');

    if (sErr) return console.error('Error fetching services:', sErr);
    console.log(`Found ${services.length} active services.`);

    // 2. Fetch Todays Invoices
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: invoices, error: iErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', todayStart.toISOString());

    if (iErr) return console.error('Error fetching invoices:', iErr);
    console.log(`Found ${invoices.length} invoices created today.`);

    // 3. Match and Create Cycles
    for (const inv of invoices) {
        // Find matching service by amount (simplest heuristic for now)
        // Note: Name might differ slightly ("Growth Sprint" vs "Growth Sprint (Feb)")
        // We look for service with same amount.
        const matches = services.filter(s => s.amount === inv.total);
        if (matches.length === 0) {
            console.log(`No service match found for invoice ${inv.number} ($${inv.total})`);
            continue;
        }

        // Use the first match, or optimize if multiple services have same amount.
        // For Oliver, likely distinct or we pick one.
        const service = matches[0];

        console.log(`Matching Invoice ${inv.number} -> Service ${service.name}`);

        // Calculate Dates (Assume Monthly Arrears for "Completed" look)
        // Start: 1 month ago
        // End: Today (Invoice Date)
        const endDate = new Date(inv.created_at);
        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);

        const cycleData = {
            id: crypto.randomUUID(), // If not auto-gen
            service_id: service.id,
            invoice_id: inv.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            due_date: inv.due_date,
            amount: inv.total,
            status: 'invoiced',
            metadata: {
                auto_generated: true,
                note: 'Fixed by Sync Script'
            }
        };

        const { error: cErr } = await supabase.from('billing_cycles').insert(cycleData);
        if (cErr) {
            console.error(`Error creating cycle for ${inv.number}:`, cErr);
        } else {
            console.log(`Cycle created: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

            // Also update invoice.billing_cycle_id if column exists (it does per migration)
            await supabase.from('invoices').update({ billing_cycle_id: cycleData.id }).eq('id', inv.id);
        }
    }
}

fixCycles();
