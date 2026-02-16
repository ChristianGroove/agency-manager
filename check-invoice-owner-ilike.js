const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoiceOwnerIlike() {
    console.log('--- CHECK INVOICE OWNER ILIKE ---');
    // Using a substring from the invoice number
    // INV-1771180277021-VCD
    const pattern = '%1771180277021%';

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, client_id, organization_id, created_at')
        .ilike('number', pattern);

    console.log(`Found ${invoices?.length || 0} matching invoices.`);

    if (invoices) {
        for (const inv of invoices) {
            console.log(`\nInvoice: ${inv.number}`);
            console.log(`Client ID: ${inv.client_id}`);

            // Fetch Client Details
            const { data: client } = await supabase
                .from('clients')
                .select('id, name, email')
                .eq('id', inv.client_id)
                .single();

            if (client) {
                console.log(`Client Name: "${client.name}"`);
                console.log(`Client Email: "${client.email}"`);
            } else {
                console.log('Client not found (orphaned invoice?)');
            }
        }
    }
}

checkInvoiceOwnerIlike();
