const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllOliverInvoices() {
    console.log('--- List All Oliver Invoices ---');
    const { data: client } = await supabase.from('clients').select('id, name').ilike('name', '%Orlando Melo%').single();
    if (!client) return console.log('Client not found');

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, date, due_date, items')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20);

    console.log(`Found ${invoices.length} invoices.`);
    invoices.forEach(i => {
        console.log(`- ${i.number} | Total: ${i.total} | Date: ${i.date} | Created: ${i.created_at}`);
        console.log(`  Item: ${i.items[0]?.description}`);
    });
}

listAllOliverInvoices();
