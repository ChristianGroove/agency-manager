
const { createClient } = require('@supabase/supabase-js');
// Env vars loaded via --env-file flag

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function payOneOff() {
    // 1. Find the invoice
    const { data: invoice } = await supabase
        .from('invoices')
        .select('id, number')
        .eq('number', 'INV-TEST-ONE-OFF')
        .single();

    if (!invoice) {
        console.error('Invoice not found');
        return;
    }

    // 2. Pay it
    const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoice.id);

    if (error) {
        console.error('Error paying invoice:', error);
    } else {
        console.log(`Invoice ${invoice.number} marked as PAID.`);
        console.log('Check portal. Service should be HIDDEN.');
    }
}

payOneOff();
