const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateOrlando() {
    console.log('--- Check Duplicate Orlando ---');
    const { data: clients } = await supabase.from('clients').select('id, name, organization_id').ilike('name', '%Orlando%');

    console.log(`Found ${clients.length} clients matching "Orlando".`);

    for (const c of clients) {
        console.log(`\nClient: ${c.name} (${c.id})`);
        const { data: services } = await supabase.from('services').select('id, name, status, frequency').eq('client_id', c.id);
        console.log(`  Services: ${services.length}`);
        services.forEach(s => {
            console.log(`    - ${s.name} (${s.status}) Freq: ${s.frequency}`);
        });
    }
}

checkDuplicateOrlando();
