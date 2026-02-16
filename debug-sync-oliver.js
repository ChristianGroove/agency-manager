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

async function syncOliver() {
    console.log('--- Syncing Services -> Subscriptions for Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Fetch Active Services (exclude deleted)
    const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .is('deleted_at', null);

    if (error) {
        console.error('Error fetching services:', error);
        return;
    }

    console.log(`Found ${services.length} ACTIVE (not deleted) services.`);

    // 2. Prepare Data
    const newSubs = services.map(service => ({
        client_id: service.client_id,
        organization_id: service.organization_id,
        name: service.name,
        amount: service.amount,
        frequency: service.frequency,
        status: 'active',
        next_billing_date: service.next_billing_date,
        service_type: 'marketing', // Valid value found in DB
        // currency: 'COP', // Try removing default if column doesn't exist
        start_date: service.start_date || new Date().toISOString()
    }));

    // Log the first one to inspect
    console.log('Sample Sub to Insert:', newSubs[0]);

    // 3. Insert New Subscriptions
    console.log(`Inserting ${newSubs.length} new subscriptions...`);
    const { data: inserted, error: insError } = await supabase
        .from('subscriptions')
        .insert(newSubs)
        .select();

    if (insError) {
        console.error('Error creating subs:', JSON.stringify(insError, null, 2));
        return;
    }

    console.log(`Successfully synced ${inserted.length} subscriptions.`);
}

syncOliver();
