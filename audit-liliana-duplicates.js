const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLilianaDuplicates() {
    console.log('--- AUDIT: Liliana Duplicates ---');

    // Search broadly
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email, organization_id')
        .ilike('name', '%Liliana%');

    console.log(`Found ${clients.length} clients matching "Liliana".`);

    for (const c of clients) {
        console.log(`\nClient: ${c.name} (${c.id})`);
        console.log(`Email: ${c.email}`);

        // Count Invoices
        const { count } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', c.id);

        console.log(`  Invoices: ${count}`);

        if (count > 0) {
            const { data: invs } = await supabase
                .from('invoices')
                .select('number, total, created_at')
                .eq('client_id', c.id)
                .limit(3);
            invs.forEach(i => console.log(`    - ${i.number} ($${i.total})`));
        }
    }
}

auditLilianaDuplicates();
