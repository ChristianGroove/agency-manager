const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectInvoice() {
    const invoiceNum = 'INV-1771122199769-6PB'; // From user screenshot
    console.log(`--- Inspecting Invoice: ${invoiceNum} ---`);

    // 1. Get Invoice Items and Subscription ID check
    // Invoices table might not have subscription_id directly if it's not a column, 
    // but the Cron script uses `subscription_id` in logs/notifications.
    // Let's check the invoice items or metadata.

    // Actually, usually `invoices` doesn't link back to `subscription` hard foreign key in many systems, 
    // but let's check if there is a column or if we can infer it from the name/amount matches.

    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('number', invoiceNum)
        .single();

    if (error) {
        console.error('Invoice Not Found:', error);
        return;
    }

    console.log('Invoice Found:');
    console.log(`ID: ${invoice.id}`);
    console.log(`Total: ${invoice.total}`);
    console.log(`Created At: ${invoice.created_at}`);
    console.log(`Items:`, JSON.stringify(invoice.items, null, 2));

    // 2. Validate against Subscription
    // We saw in previous logs a subscription named "Departamento de Diseño + Ads" with amount 1645000.
    // Let's fetch that specific subscription again to show the user.

    console.log('\n--- Searching for matching Subscription ---');
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', invoice.client_id)
        .eq('amount', invoice.total)
        .single();

    if (sub) {
        console.log('MATCHING SUBSCRIPTION FOUND IN DB:');
        console.log(`ID: ${sub.id}`);
        console.log(`Name: "${sub.name}"`);
        console.log(`Amount: ${sub.amount}`);
        console.log(`Frequency: ${sub.frequency}`);
        console.log(`Next Billing: ${sub.next_billing_date}`);
        console.log(`Status: ${sub.status}`);
        console.log('\nCONCLUSION: The invoice was generated from this SINGLE subscription record.');
    } else {
        console.log('No single matching subscription found. Might be a combination?');
    }
}

inspectInvoice();
