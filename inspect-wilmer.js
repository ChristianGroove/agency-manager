const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectWilmer() {
    console.log('--- Inspecting Wilmer Espinoza ---');
    // Client ID from previous output or name search
    const { data: client } = await supabase.from('clients').select('id').eq('name', 'Wilmer Espinoza').single();
    if (!client) return console.log('Client not found');

    const clientId = client.id;

    // Services
    const { data: services } = await supabase.from('services').select('*').eq('client_id', clientId);
    console.log('Services:', services.map(s => `${s.name} ($${s.amount}) [${s.status}]`));

    // Invoices 2026
    const { data: invoices } = await supabase.from('invoices').select('*').eq('client_id', clientId).gte('created_at', '2026-01-01');
    console.log('Invoices:', invoices.map(i => `${i.number} ($${i.total})`));

    // Items in invoice?
    if (invoices.length > 0) {
        console.log('Items in first invoice:', JSON.stringify(invoices[0].items));
    }
}

inspectWilmer();
