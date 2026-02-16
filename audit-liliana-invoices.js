const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLilianaInvoices() {
    console.log('--- AUDIT: Liliana Melo Murillo Invoices ---');

    // 1. Find Client
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email')
        .ilike('name', '%Liliana Melo%');

    if (!clients || clients.length === 0) return console.log('Client not found');

    const client = clients[0];
    console.log(`Client: ${client.name} (${client.id})`);

    // 2. Fetch All Invoices
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, amount, total, status, date, created_at, items')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

    console.log(`Found ${invoices.length} invoices in DB:`);
    invoices.forEach(i => {
        const dateStr = i.date ? i.date.split('T')[0] : 'No Date';
        console.log(`${i.number} | $${i.total} | Status: ${i.status} | Date: ${dateStr} | ID: ${i.id}`);
    });
}

auditLilianaInvoices();
