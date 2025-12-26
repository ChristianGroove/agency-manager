
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testKey(name, key) {
    console.log(`Testing ${name}...`);
    if (!key) {
        console.log(`❌ ${name} is missing in .env.local`);
        return;
    }

    const client = createClient(url, key);
    const { data, error } = await client.from('services').select('count', { count: 'exact', head: true });

    if (error) {
        console.log(`❌ ${name} Failed: ${error.message}`);
    } else {
        console.log(`✅ ${name} Working!`);
    }
}

async function run() {
    await testKey('Anon Key', anonKey);
    await testKey('Service Role Key', serviceKey);
}

run();
