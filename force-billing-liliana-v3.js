const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBillingLilianaV3() {
    console.log('--- Force Billing Liliana V3 ---');

    // 1. Client
    const { data: client } = await supabase.from('clients').select('id, organization_id').ilike('name', '%Liliana Melo%').single();
    if (!client) return console.log('Client not found');

    const clientId = client.id;
    console.log(`Client ID: ${clientId}`);

    // 2. Find Service
    const { data: service } = await supabase.from('services').select('*').eq('client_id', clientId).ilike('name', '%CRM%').single();
    if (!service) return console.log('Service not found');

    // 3. Find/Create Sub
    // Try finding by name
    let { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .ilike('name', service.name)
        .maybeSingle();

    if (!sub) {
        console.log('Sub not found. Creating one (No Org ID)...');
        // Try inserting WITHOUT organization_id
        const { data: newSub, error } = await supabase.from('subscriptions').insert({
            client_id: clientId,
            name: service.name,
            amount: service.amount,
            currency: 'COP',
            frequency: 'monthly',
            status: 'active',
            next_billing_date: '2026-01-14T00:00:00.000Z',
            created_at: new Date().toISOString()
        }).select().single();

        if (error) {
            console.error('Insert Failed:', error);
            return;
        }
        sub = newSub;
        console.log('Sub created successfully.');
    } else {
        console.log(`Sub found: ${sub.id}`);
    }

    // 4. Force Billing
    await createInvoice(sub, client.organization_id, '2026-01-14');
    await createInvoice(sub, client.organization_id, '2026-02-14');

    // 5. Update Dates
    const nextBill = '2026-03-14T05:00:00.000Z';
    console.log(`Updating next billing to: ${nextBill}`);

    await supabase.from('services').update({ next_billing_date: nextBill }).eq('id', service.id);
    await supabase.from('subscriptions').update({ next_billing_date: nextBill }).eq('id', sub.id);
}

async function createInvoice(sub, orgId, dateStr) {
    // Check if invoice exists?
    // No, force creation to be safe (billing catchup)

    const dueDate = new Date(dateStr);
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
            organization_id: orgId, // Invoice usually requires Org ID
            client_id: sub.client_id,
            number: invoiceNumber,
            date: new Date().toISOString(),
            due_date: dueDate.toISOString(),
            items: [{ description: sub.name, quantity: 1, price: sub.amount }],
            total: sub.amount,
            status: 'pending',
            document_type: 'CUENTA_DE_COBRO'
        })
        .select()
        .single();

    if (error) console.error(`Error creating invoice for ${dateStr}:`, error);
    else {
        // Create Cycle
        const cycleStart = new Date(dueDate);
        cycleStart.setMonth(cycleStart.getMonth() - 1);

        // Find service ID
        const { data: svc } = await supabase.from('services').select('id').eq('client_id', sub.client_id).ilike('name', sub.name).maybeSingle();

        const { data: cycle } = await supabase.from('billing_cycles').insert({
            service_id: svc ? svc.id : null,
            invoice_id: invoice.id,
            start_date: cycleStart.toISOString(),
            end_date: dueDate.toISOString(),
            amount: sub.amount,
            status: 'invoiced',
            metadata: { source: 'force_script_v3' }
        }).select().single();

        if (cycle) {
            await supabase.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
        }
        console.log(`[DONE] Invoice ${invoiceNumber} created for ${dateStr}`);
    }
}

forceBillingLilianaV3();
