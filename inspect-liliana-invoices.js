const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLilianaInvoicesDetail() {
    console.log('--- INSPECT LILIANA INVOICES DETAIL ---');
    const clientId = '95e7f87f-d209-44d6-8b33-497b06c72a51';

    // Invoices from Screenshot
    const targetNumbers = [
        'INV-1771180277021-VCD',
        'INV-1771129680504-SX6',
        'INV-1768494210446-JJ1',
        'INV-1768494167219-160',
        'INV-1767037133305-16Q'
    ];

    const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    console.log(`\nTotal Invoices for Client: ${invoices.length}`);

    invoices.forEach(inv => {
        const isTarget = targetNumbers.some(t => inv.number.includes(t.split('-')[1])); // Match by timestamp part to be safe
        const marker = isTarget ? '>>> TARGET' : '    ';

        console.log(`${marker} ${inv.number}`);
        console.log(`    ID: ${inv.id}`);
        console.log(`    Amount: $${inv.total}`);
        console.log(`    Status: ${inv.status}`);
        console.log(`    Date: ${inv.date}`);
        console.log(`    Created At: ${inv.created_at}`);
        console.log(`    Deleted At: ${inv.deleted_at}`);
        console.log(`    Items: ${JSON.stringify(inv.items)}`);
        console.log(`    Metadata: ${JSON.stringify(inv.metadata)}`);
        console.log('--------------------------------------------------');
    });
}

inspectLilianaInvoicesDetail();
