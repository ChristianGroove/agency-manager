const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBillingLiliana() {
    console.log('--- Force Billing Liliana (Jan & Feb) ---');

    // 1. Get Client & Sub
    const { data: client } = await supabase.from('clients').select('id, organization_id').ilike('name', '%Liliana Melo%').single();
    const clientId = client.id;

    const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .ilike('name', '%CRM Empresarial%')
        .single();

    if (!sub) return console.log('Sub not found');

    // 2. Check existing invoices for Jan & Feb
    const { data: invoices } = await supabase
        .from('invoices')
        .select('created_at, billing_cycle_id')
        .eq('client_id', clientId);

    const hasJan = invoices.some(i => i.created_at.includes('2026-01'));
    const hasFeb = invoices.some(i => i.created_at.includes('2026-02'));

    console.log(`Has Jan Invoice? ${hasJan}`);
    console.log(`Has Feb Invoice? ${hasFeb}`);

    // 3. Force Create Jan 14
    if (!hasJan) {
        console.log('Generating JAN 14 Invoice...');
        await createInvoice(sub, '2026-01-14');
    }

    // 4. Force Create Feb 14
    if (!hasFeb) {
        console.log('Generating FEB 14 Invoice...');
        await createInvoice(sub, '2026-02-14');
    }

    // 5. Update Cycle Dates
    // Ensure Next Billing is March 14
    const nextBill = '2026-03-14T05:00:00.000Z'; // 5AM UTC assumption
    await supabase.from('services').update({ next_billing_date: nextBill }).eq('client_id', clientId).ilike('name', '%CRM Empresarial%');
    await supabase.from('subscriptions').update({ next_billing_date: nextBill }).eq('id', sub.id);
    console.log('Dates updated to March 14.');
}

async function createInvoice(sub, dateStr) {
    const dueDate = new Date(dateStr);
    const cycleStart = new Date(dueDate);
    cycleStart.setMonth(cycleStart.getMonth() - 1);

    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const invoiceNumber = `INV-${Date.now()}-${randomSuffix}`;

    // Insert Invoice
    const { data: invoice } = await supabase
        .from('invoices')
        .insert({
            organization_id: sub.organization_id,
            client_id: sub.client_id,
            number: invoiceNumber,
            date: new Date().toISOString(), // Created NOW
            due_date: dueDate.toISOString(), // Due then
            items: [{
                description: sub.name,
                quantity: 1,
                price: sub.amount
            }],
            total: sub.amount,
            status: 'pending',
            document_type: 'CUENTA_DE_COBRO'
        })
        .select()
        .single();

    // Insert Cycle
    const { data: service } = await supabase.from('services').select('id').eq('client_id', sub.client_id).ilike('name', '%CRM Empresarial%').single();

    if (invoice && service) {
        const { data: cycle } = await supabase
            .from('billing_cycles')
            .insert({
                service_id: service.id,
                invoice_id: invoice.id,
                start_date: cycleStart.toISOString(),
                end_date: dueDate.toISOString(),
                amount: sub.amount,
                status: 'invoiced',
                metadata: { source: 'force_script' }
            })
            .select()
            .single();

        await supabase.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
        console.log(`Created Invoice ${invoiceNumber} & Cycle ${cycle.id}`);
    }
}

forceBillingLiliana();
