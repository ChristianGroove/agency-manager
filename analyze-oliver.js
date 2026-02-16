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

async function analyze() {
    console.log('--- Analyzing Subs for Oliver (f9989878...) ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId);

    if (error) {
        console.error(error);
        return;
    }

    if (!subs || subs.length === 0) {
        console.log('No subscriptions found.');
        return;
    }

    console.log(`Found ${subs.length} subscriptions (All Statuses):`);
    subs.forEach(sub => {
        console.log(`\n- [${sub.id}] ${sub.name}`);
        console.log(`  Amount: ${sub.amount} | Freq: ${sub.frequency}`);
        console.log(`  Status: ${sub.status}`);
        console.log(`  Next Billing: ${sub.next_billing_date}`);
    });
}

analyze();
