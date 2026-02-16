const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLilianaSub() {
    console.log('--- Debugging Liliana Subscription ---');
    const { data: client } = await supabase.from('clients').select('id').ilike('name', '%Liliana Melo%').single();
    if (!client) return console.log('Client not found');

    const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', client.id);

    console.log(`Found ${subs.length} subs for Liliana.`);
    subs.forEach(s => {
        console.log(`Sub: ${s.name} | Status: ${s.status} | NextBill: ${s.next_billing_date}`);
    });
}

debugLilianaSub();
