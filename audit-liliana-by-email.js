const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLilianaByEmail() {
    console.log('--- AUDIT: Liliana By Email ---');
    const email = 'contabilidad.carnavalmirador@gmail.com';

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at')
        .eq('email', email);

    console.log(`Found ${clients.length} clients with email ${email}:`);

    for (const c of clients) {
        console.log(`\nClient: ${c.name} (${c.id})`);

        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, number, total, status, date, items')
            .eq('client_id', c.id);

        console.log(`  Invoices: ${invoices.length}`);
        invoices.forEach(i => {
            console.log(`    - ${i.number} | $${i.total} | ${i.status} | ${i.items[0]?.description}`);
        });
    }
}

auditLilianaByEmail();
