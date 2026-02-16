const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLilianaSubscriptions() {
    console.log('--- AUDIT: Liliana Subscriptions ---');
    const clientId = '95e7f87f-d209-44d6-8b33-497b06c72a51';

    // 1. Fetch Subscriptions
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null); // Active only

    console.log(`Found ${subs.length} Active Subscriptions:`);

    subs.forEach(s => {
        console.log(`\nID: ${s.id}`);
        console.log(`Name: ${s.name}`);
        console.log(`Amount: $${s.amount}`);
        console.log(`Frequency: ${s.frequency}`);
        console.log(`Next Billing: ${s.next_billing_date}`);
        console.log(`Created At: ${s.created_at}`);
    });

    // 2. Fetch Services (Comparison)
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId);

    console.log(`\n\nFound ${services.length} Services:`);
    services.forEach(s => {
        console.log(`\nID: ${s.id}`);
        console.log(`Name: ${s.name}`);
        console.log(`Status: ${s.status}`);
        console.log(`Amount: $${s.amount}`);
        console.log(`Billing Cycle: ${s.billing_cycle}`);
        console.log(`Next Billing: ${s.next_billing_date}`);
    });
}

auditLilianaSubscriptions();
