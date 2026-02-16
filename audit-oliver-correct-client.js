const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOliverCorrectClient() {
    console.log('--- AUDIT: Oliver Correct Client (f99...) ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    const { data: client } = await supabase.from('clients').select('id, name').eq('id', clientId).single();
    console.log(`Client: ${client?.name} (${clientId})`);

    // Get Invoices Today/Recent
    const today = new Date();
    today.setDate(today.getDate() - 2); // Look back 48h

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, date, items')
        .eq('client_id', clientId)
        .gte('created_at', today.toISOString());

    console.log(`Found ${invoices.length} recent invoices.`);
    invoices.forEach(i => {
        console.log(`Inv: ${i.number} | Total: ${i.total}`);
        console.log(`  Date: ${i.date} | Created: ${i.created_at}`);
        console.log(`  Item: ${i.items[0]?.description}`);
    });
}

auditOliverCorrectClient();
