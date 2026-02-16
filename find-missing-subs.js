const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findSubs() {
    console.log('--- Searching Subs by Amount ---');

    // Search for 1850000
    const { data: subs, error } = await supabase
        .from('subscriptions')
        .select(`
            id, name, amount, next_billing_date, status,
            client:clients (id, name),
            organization:organizations (id, name)
        `)
        .eq('amount', 1850000);

    if (error) {
        console.error(error);
        return;
    }

    const fs = require('fs');
    if (!subs || subs.length === 0) {
        fs.writeFileSync('subs.json', JSON.stringify({ message: "No subs found" }, null, 2));
        return;
    }

    fs.writeFileSync('subs.json', JSON.stringify(subs, null, 2));
    console.log('Written to subs.json');
}

findSubs();
