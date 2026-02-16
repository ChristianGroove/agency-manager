const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLilianaInvoiceItems() {
    console.log('--- INSPECT INVOICE ITEMS ---');
    const targetNumber = 'INV-1771180277021-VCD'; // The 1.086.000 one

    const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('number', targetNumber) // Assuming formatted number matches DB
        .maybeSingle();

    // If not found, try searching by partial
    if (!inv) {
        console.log('Exact match failed, trying partial...');
        const { data: list } = await supabase
            .from('invoices')
            .select('*')
            .ilike('number', '%1771180277021%');

        if (list && list.length > 0) {
            const i = list[0];
            console.log(`Found: ${i.number} ($${i.total})`);
            console.log('ITEMS:');
            console.dir(i.items, { depth: null });
        } else {
            console.log('Invoice not found.');
        }
    } else {
        console.log(`Found: ${inv.number} ($${inv.total})`);
        console.log('ITEMS:');
        console.dir(inv.items, { depth: null });
    }
}

inspectLilianaInvoiceItems();
