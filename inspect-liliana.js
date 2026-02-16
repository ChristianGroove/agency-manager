const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLiliana() {
    console.log('--- Inspecting Liliana Melo Murillo ---');
    // Find client
    const { data: client } = await supabase.from('clients').select('id').ilike('name', '%Liliana Melo%').single();
    if (!client) return console.log('Client not found');

    const clientId = client.id;
    console.log(`Client ID: ${clientId}`);

    // Services
    const { data: services } = await supabase.from('services').select('*').eq('client_id', clientId);
    console.log(`\nServices:`);
    services.forEach(s => {
        console.log(`- ${s.name} ($${s.amount})`);
        console.log(`  Status: ${s.status}`);
        console.log(`  Start: ${s.service_start_date}`);
        console.log(`  Next Bill (Service): ${s.next_billing_date}`);
    });

    // Subscriptions
    const { data: subs } = await supabase.from('subscriptions').select('*').eq('client_id', clientId);
    console.log(`\nSubscriptions:`);
    subs.forEach(s => {
        console.log(`- ${s.name} ($${s.amount})`);
        console.log(`  Status: ${s.status}`);
        console.log(`  Next Bill (Sub): ${s.next_billing_date}`);
    });

    // Invoices
    const { data: invoices } = await supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    console.log(`\nInvoices (${invoices.length}):`);
    invoices.forEach(i => {
        console.log(`- ${i.number} ($${i.total}) Date: ${i.created_at}`);
    });
}

inspectLiliana();
