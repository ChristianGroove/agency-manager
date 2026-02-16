const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreOliverMonthly() {
    console.log('--- Restore Oliver Monthly Invoices (Backdated) ---');
    const { data: client } = await supabase.from('clients').select('id, name, organization_id').ilike('name', '%Orlando Melo%').single();
    if (!client) return console.log('Client not found');

    // 1. Service 1: Departamento (Monthly) -> Feb 5
    // Note: User said "5", logs said "6". I will use 5 to match user request.
    const { data: serv1 } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', client.id)
        .ilike('name', '%Diseño%')
        .neq('frequency', 'quarterly') // Exclude the fixed quarterly one
        .maybeSingle(); // Hopefully only one monthly design service

    if (serv1) {
        console.log(`Restoring Service 1: ${serv1.name} (ID: ${serv1.id})`);
        await createBackdatedInvoice(client, serv1, '2026-02-05');

        // Update Next to March 5
        await supabase.from('services').update({ next_billing_date: '2026-03-05T05:00:00.000Z' }).eq('id', serv1.id);
        // Sync Sub
        await supabase.from('subscriptions').update({ next_billing_date: '2026-03-05T05:00:00.000Z' }).eq('client_id', client.id).ilike('name', serv1.name);
    } else {
        console.log('Service 1 (Monthly Design) not found or multiple found.');
    }

    // 2. Service 2: Growth Sprint -> Feb 12
    const { data: serv2 } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', client.id)
        .ilike('name', '%Growth%')
        .maybeSingle();

    if (serv2) {
        console.log(`Restoring Service 2: ${serv2.name} (ID: ${serv2.id})`);
        await createBackdatedInvoice(client, serv2, '2026-02-12');

        // Update Next to March 12
        await supabase.from('services').update({ next_billing_date: '2026-03-12T05:00:00.000Z' }).eq('id', serv2.id);
        // Sync Sub
        await supabase.from('subscriptions').update({ next_billing_date: '2026-03-12T05:00:00.000Z' }).eq('client_id', client.id).ilike('name', serv2.name);
    } else {
        console.log('Service 2 (Growth) not found.');
    }
}

async function createBackdatedInvoice(client, service, dateStr) {
    const issueDate = new Date(dateStr);
    const issueStr = issueDate.toISOString();

    // Check if duplicate exists for this date?
    // We already deleted them, but good to be safe.
    // Just create.

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
            organization_id: client.organization_id,
            client_id: client.id,
            number: invoiceNumber,
            date: issueStr,        // BACKDATED DATE
            created_at: issueStr,  // BACKDATED CREATION
            due_date: issueStr,    // Due same day
            items: [{ description: service.name, quantity: 1, price: service.amount }],
            total: service.amount,
            status: 'pending',
            document_type: 'CUENTA_DE_COBRO'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating invoice:', error.message);
        return;
    }

    // Cycle
    const start = new Date(issueDate);
    start.setMonth(start.getMonth() - 1);

    await supabase.from('billing_cycles').insert({
        service_id: service.id,
        invoice_id: invoice.id,
        start_date: start.toISOString(),
        end_date: issueStr,
        amount: service.amount,
        status: 'invoiced',
        metadata: { source: 'manual_restore_backdate' }
    });

    console.log(`[DONE] Invoice ${invoiceNumber} created for ${dateStr}`);
}

restoreOliverMonthly();
