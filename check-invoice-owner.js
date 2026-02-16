const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoiceOwner() {
    console.log('--- CHECK INVOICE OWNER ---');
    const invoiceNumber = '#INV-1771180277021-VCD'; // From screenshot, user has # prefix
    const cleanNumber = 'INV-1771180277021-VCD'; // Also try without #

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, client_id, organization_id, created_at')
        .or(`number.eq.${invoiceNumber},number.eq.${cleanNumber}`);

    console.log(`Found ${invoices.length} invoices matching number.`);

    for (const inv of invoices) {
        console.log(`Invoice: ${inv.number}`);
        console.log(`Client ID: ${inv.client_id}`);
        console.log(`Org ID: ${inv.organization_id}`);

        // Fetch Client Details
        const { data: client } = await supabase
            .from('clients')
            .select('id, name, email')
            .eq('id', inv.client_id)
            .single();

        console.log(`Client Name: ${client?.name}`);
        console.log(`Client Email: ${client?.email}`);
    }
}

checkInvoiceOwner();
