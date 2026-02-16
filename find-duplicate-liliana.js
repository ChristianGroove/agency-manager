const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findDuplicateLiliana() {
    console.log('--- FIND DUPLICATE LILIANA ---');
    const knownId = '95e7f87f-d209-44d6-8b33-497b06c72a51';

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email')
        .ilike('name', '%Liliana%')
        .neq('id', knownId);

    console.log(`Found ${clients.length} potential duplicates (excluding known ID).`);

    clients.forEach(c => {
        console.log(`DUPLICATE FOUND:`);
        console.log(`ID: ${c.id}`);
        console.log(`Name: ${c.name}`);
        console.log(`Email: ${c.email}`);
    });
}

findDuplicateLiliana();
