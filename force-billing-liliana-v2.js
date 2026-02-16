const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceBillingLilianaV2() {
    console.log('--- Force Billing Liliana V2 ---');

    // 1. Get Client
    const { data: client } = await supabase.from('clients').select('id, organization_id').ilike('name', '%Liliana Melo%').single();
    const clientId = client.id;

    // 2. Get All Subs
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId);

    console.log(`Found ${subs.length} subs.`);
    subs.forEach(s => console.log(`- ${s.name} (${s.id})`));

    // 3. Find the CRM one
    const targetSub = subs.find(s => s.name.includes('CRM') || s.name.includes('crm'));

    if (!targetSub) {
        console.log('CRITICAL: CRM Subscription NOT found even after fix-liliana.js run?');
        // Re-run fix logic inline
        const { data: service } = await supabase.from('services').select('*').eq('client_id', clientId).ilike('name', '%CRM%').single();
        if (service) {
            console.log('Re-creating sub independently...');
            const { data: newSub, error } = await supabase.from('subscriptions').insert({
                organization_id: client.organization_id,
                client_id: clientId,
                name: service.name,
                amount: service.amount,
                currency: 'COP',
                frequency: 'monthly',
                status: 'active',
                next_billing_date: '2026-01-14T00:00:00.000Z', // Force Past
                created_at: new Date().toISOString()
            }).select().single();

            if (newSub) {
                console.log('Created new sub. Now billing it.');
                await billSub(newSub);
            } else {
                console.error('Failed to create sub:', error);
            }
        }
    } else {
        console.log(`Found Matching Sub: ${targetSub.name}. Billing it.`);
        await billSub(targetSub);
    }
}

async function billSub(sub) {
    // Check invoices
    const { data: invoices } = await supabase.from('invoices').select('created_at').eq('client_id', sub.client_id).ilike('number', 'INV-%');
    const hasJan = invoices.some(i => i.created_at.includes('2026-01') || i.created_at.includes('2026-02')); // Check recent

    // Force generate Jan 14
    console.log('Generating JAN 14 Invoice...');
    await createInvoice(sub, '2026-01-14');

    // Force generate Feb 14
    console.log('Generating FEB 14 Invoice...');
    await createInvoice(sub, '2026-02-14');

    // Update dates
    const nextBill = '2026-03-14T05:00:00.000Z';
    await supabase.from('services').update({ next_billing_date: nextBill }).eq('client_id', sub.client_id).ilike('name', '%CRM%');
    await supabase.from('subscriptions').update({ next_billing_date: nextBill }).eq('id', sub.id);
}

async function createInvoice(sub, dateStr) {
    const dueDate = new Date(dateStr);
    const cycleStart = new Date(dueDate);
    cycleStart.setMonth(cycleStart.getMonth() - 1);

    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const invoiceNumber = `INV-${Date.now()}-${randomSuffix}`;

    const { data: invoice } = await supabase
        .from('invoices')
        .insert({
            organization_id: sub.organization_id,
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

    const { data: service } = await supabase.from('services').select('id').eq('client_id', sub.client_id).ilike('name', '%CRM%').single();

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
                metadata: { source: 'force_script_v2' }
            })
            .select()
            .single();

        await supabase.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
        console.log(`[DONE] Created Invoice ${invoiceNumber} for ${dateStr}`);
    }
}

forceBillingLilianaV2();
