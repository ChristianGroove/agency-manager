const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findLilianaEmailIlike() {
    console.log('--- FIND LILIANA BY EMAIL (ILIKE) ---');
    const emailPart = '%contabilidad.carnavalmirador%';

    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .ilike('email', emailPart);

    console.log(`Found ${clients.length} clients.`);

    clients.forEach(c => {
        console.log(`\nID:    ${c.id}`);
        console.log(`Name:  "${c.name}"`);
        console.log(`Email: "${c.email}"`);
        console.log(`Org:   ${c.organization_id}`);
    });
}

findLilianaEmailIlike();
