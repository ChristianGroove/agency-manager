const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBatchBilling() {
    console.log('--- GLOBAL BATCH BILLING (Force Catch-up) ---');
    const today = new Date();

    // 1. Get Overdue Services
    const { data: services } = await supabase
        .from('services')
        .select('id, name, amount, next_billing_date, client_id, client:clients(organization_id)')
        .eq('status', 'active')
        .lte('next_billing_date', today.toISOString());

    console.log(`Found ${services.length} overdue services.`);

    for (const service of services) {
        if (!service.next_billing_date) continue;

        let pendingDate = new Date(service.next_billing_date);
        let safety = 0;

        console.log(`\nProcessing: ${service.name} (Due: ${pendingDate.toISOString()})`);

        while (pendingDate <= today && safety < 3) {
            console.log(`  >> BILLING for: ${pendingDate.toISOString()}`);

            // Generate Invoice
            const invoiceDate = new Date(); // Created Now
            const dueDate = new Date(pendingDate); // Due Then

            const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
            const invoiceNumber = `INV-${Date.now()}-${randomSuffix}`;

            // Insert Invoice
            const { data: invoice, error } = await supabase
                .from('invoices')
                .insert({
                    organization_id: service.client?.organization_id, // Safely access
                    client_id: service.client_id,
                    number: invoiceNumber,
                    date: invoiceDate.toISOString(),
                    due_date: dueDate.toISOString(),
                    items: [{ description: service.name, quantity: 1, price: service.amount }],
                    total: service.amount,
                    status: 'pending',
                    document_type: 'CUENTA_DE_COBRO'
                })
                .select('id')
                .single();

            if (error) {
                console.error('    [ERROR] Invoice failed:', error.message);
                break; // Stop catchup for this service if failed
            }

            // Create Cycle
            const cycleStart = new Date(pendingDate);
            cycleStart.setMonth(cycleStart.getMonth() - 1); // Assume monthly

            const { data: cycle } = await supabase.from('billing_cycles').insert({
                service_id: service.id,
                invoice_id: invoice.id,
                start_date: cycleStart.toISOString(),
                end_date: pendingDate.toISOString(),
                amount: service.amount,
                status: 'invoiced',
                metadata: { source: 'batch_catchup' }
            }).select('id').single();

            if (cycle) {
                await supabase.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
            }
            console.log(`    [SUCCESS] Invoice ${invoiceNumber} generated.`);

            // Advance Date
            pendingDate.setMonth(pendingDate.getMonth() + 1);

            // Update Service immediately to prevent double run
            await supabase.from('services').update({ next_billing_date: pendingDate.toISOString() }).eq('id', service.id);

            // Update Subscription if exists (Best Effort)
            await supabase.from('subscriptions')
                .update({ next_billing_date: pendingDate.toISOString() })
                .eq('client_id', service.client_id)
                .ilike('name', service.name);

            safety++;
        }

        console.log(`  >> Service updated to: ${pendingDate.toISOString()}`);
    }
}

forceBatchBilling();
