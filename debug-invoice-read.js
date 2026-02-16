const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInvoiceRead() {
    console.log('--- DEBUG INVOICE READ ---');
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('id, number')
            .limit(5);

        if (error) {
            console.error('Error fetching invoices:', error);
        } else {
            console.log(`Successfully fetched ${data.length} invoices.`);
            data.forEach(i => console.log(i.number));
        }

        // Try specific invoice
        const num = 'INV-1771180277021-VCD';
        console.log(`Searching for ${num}...`);
        const { data: inv, error: invError } = await supabase
            .from('invoices')
            .select('*')
            .eq('number', num)
            .maybeSingle();

        if (invError) console.error('Error fetching specific invoice:', invError);
        else if (inv) {
            console.log('FOUND INVOICE!');
            console.log('ID:', inv.id);
            console.log('Client ID:', inv.client_id);
        } else {
            console.log('Invoice NOT found.');
        }

    } catch (e) {
        console.error('CRASH:', e);
    }
}

debugInvoiceRead();
