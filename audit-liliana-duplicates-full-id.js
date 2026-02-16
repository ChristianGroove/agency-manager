const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLilianaDuplicatesFullId() {
    console.log('--- AUDIT: Liliana Duplicates FULL ID ---');

    // Search broadly
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', '%Liliana%');

    console.log(`Found ${clients.length} clients matching "Liliana".`);

    for (const c of clients) {
        console.log(`\n--------------------------------------------------`);
        console.log(`ID:        ${c.id}`);
        console.log(`Name:      "${c.name}"`);
        console.log(`Email:     "${c.email}"`);
        console.log(`Org ID:    ${c.organization_id}`);

        // Count Invoices
        const { count } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', c.id);

        console.log(`Invoices:  ${count}`);
    }
}

auditLilianaDuplicatesFullId();
