const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditFinalState() {
    console.log('--- FINAL AUDIT STATE ---');

    // Liliana
    const lilianaId = '95e7f87f-d209-44d6-8b33-497b06c72a51';
    console.log('\n--> Liliana Invoices:');
    const { data: invL } = await supabase
        .from('invoices')
        .select('number, total, items')
        .eq('client_id', lilianaId)
        .order('created_at', { ascending: false });

    invL.forEach(i => console.log(`  ${i.number} | $${i.total} | ${i.items[0]?.description}`));

    // Oliver/Dannicel
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .or('name.ilike.%Dannicel%,name.ilike.%Oliver%');

    for (const c of clients) {
        console.log(`\n--> ${c.name} Invoices:`);
        const { data: invD } = await supabase
            .from('invoices')
            .select('number, total, items')
            .eq('client_id', c.id)
            .order('created_at', { ascending: false });

        invD.forEach(i => console.log(`  ${i.number} | $${i.total} | ${i.items[0]?.description}`));
    }
}

auditFinalState();
