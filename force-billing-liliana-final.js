const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBillingLilianaFinal() {
    console.log('--- Force Billing Liliana FINAL (Direct Service) ---');

    // 1. Client
    const { data: client } = await supabase.from('clients').select('id, organization_id').ilike('name', '%Liliana Melo%').single();
    if (!client) return console.log('Client not found');
    const clientId = client.id;
    const orgId = client.organization_id;

    // 2. Find Service
    const { data: service } = await supabase.from('services').select('id, name, amount').eq('client_id', clientId).ilike('name', '%CRM%').single();
    if (!service) return console.log('Service not found');

    console.log(`Service: ${service.name}`);

    // 3. Force Billing (Jan 14, Feb 14)
    await createInvoice(service, clientId, orgId, '2026-01-14');
    await createInvoice(service, clientId, orgId, '2026-02-14');

    // 4. Update Service Date Only
    const nextBill = '2026-03-14T05:00:00.000Z';
    console.log(`Updating Service Next Billing to: ${nextBill}`);
    await supabase.from('services').update({ next_billing_date: nextBill }).eq('id', service.id);
}

async function createInvoice(service, clientId, orgId, dateStr) {
    const dueDate = new Date(dateStr);
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Insert Invoice
    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
            organization_id: orgId,
            client_id: clientId,
            number: invoiceNumber,
            date: new Date().toISOString(), // Created NOW (or backdated? User wants it generated)
            // Ideally date is 'now', due_date is 'then'.
            due_date: dueDate.toISOString(),
            items: [{ description: service.name, quantity: 1, price: service.amount }],
            total: service.amount,
            status: 'pending', // Pending payment
            document_type: 'CUENTA_DE_COBRO'
        })
        .select('id')
        .single();

    if (error) {
        console.error(`Error creating invoice ${dateStr}:`, error.message);
    } else {
        // Cycle
        const cycleStart = new Date(dueDate);
        cycleStart.setMonth(cycleStart.getMonth() - 1);

        const { data: cycle } = await supabase.from('billing_cycles').insert({
            service_id: service.id,
            invoice_id: invoice.id,
            start_date: cycleStart.toISOString(),
            end_date: dueDate.toISOString(),
            amount: service.amount,
            status: 'invoiced',
            metadata: { source: 'force_final_script' }
        }).select('id').single();

        if (cycle) {
            await supabase.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
        }
        console.log(`[DONE] Invoice ${invoiceNumber} created for ${dateStr}`);
    }
}

forceBillingLilianaFinal();
