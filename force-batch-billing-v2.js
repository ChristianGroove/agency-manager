const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBatchBillingV2() {
    console.log('--- GLOBAL BATCH BILLING V2 (Frequency Aware) ---');
    const today = new Date();

    // 1. Get Overdue Services
    const { data: services } = await supabase
        .from('services')
        .select('id, name, amount, next_billing_date, client_id, frequency, client:clients(organization_id)')
        .eq('status', 'active')
        .lte('next_billing_date', today.toISOString());

    console.log(`Found ${services.length} overdue services.`);

    for (const service of services) {
        if (!service.next_billing_date) continue;

        let pendingDate = new Date(service.next_billing_date);
        let safety = 0;

        console.log(`\nProcessing: ${service.name} (Due: ${pendingDate.toISOString()})`);

        // Determine Frequency match for loop
        // If frequency is missing in service, check name?
        // Default to monthly if unknown, but check name for "Anual".
        let freq = service.frequency || 'monthly';
        if (service.name.toLowerCase().includes('anual')) freq = 'yearly';

        console.log(`  Frequency: ${freq}`);

        while (pendingDate <= today && safety < 5) {
            console.log(`  >> BILLING for: ${pendingDate.toISOString()}`);

            // Advance/Next Date Calc
            const nextDate = new Date(pendingDate);
            let cycleStart = new Date(pendingDate);

            if (freq === 'yearly') {
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                cycleStart.setFullYear(cycleStart.getFullYear() - 1);
            } else {
                nextDate.setMonth(nextDate.getMonth() + 1);
                cycleStart.setMonth(cycleStart.getMonth() - 1);
            }

            // Generate Invoice
            const invoiceDate = new Date();
            const dueDate = new Date(pendingDate);
            const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

            // Insert Invoice
            const { data: invoice, error } = await supabase
                .from('invoices')
                .insert({
                    organization_id: service.client?.organization_id,
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
                break;
            }

            // Create Cycle
            const { data: cycle } = await supabase.from('billing_cycles').insert({
                service_id: service.id,
                invoice_id: invoice.id,
                start_date: cycleStart.toISOString(), // Start of covered period
                end_date: pendingDate.toISOString(), // End of covered period
                amount: service.amount,
                status: 'invoiced',
                metadata: { source: 'batch_catchup_v2' }
            }).select('id').single();

            if (cycle) {
                await supabase.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
            }
            console.log(`    [SUCCESS] Invoice ${invoiceNumber} generated.`);

            // Advance
            pendingDate = nextDate;

            // Update Service
            await supabase.from('services').update({ next_billing_date: pendingDate.toISOString() }).eq('id', service.id);

            // Update Subscription if likely match
            await supabase.from('subscriptions')
                .update({ next_billing_date: pendingDate.toISOString() })
                .eq('client_id', service.client_id)
                .ilike('name', service.name);

            safety++;
        }

        console.log(`  >> Service updated to: ${pendingDate.toISOString()}`);
    }
}

forceBatchBillingV2();
