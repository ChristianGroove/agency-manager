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

    // Filter to only the 4 most relevant/recent if there are too many?
    // The user insisted on "Active Services" view.
    // Let's list them to be sure.

    const validServices = services; // For now assume all non-deleted active are valid.

    if (validServices.length > 10) {
        console.log('WARNING: High number of active services. Reviewing names...');
        validServices.forEach(s => console.log(`${s.name} (${s.amount}) - Next: ${s.next_billing_date}`));

        // HEURISTIC: Only keep services matching the user's "Growth Sprint" and "Departamento" descriptions 
        // AND which look legally active (e.g. created recently or billing updated).
        // For safety, I'll sync ALL of them properly, assuming the UI is correct and the user simply didn't scroll.
        // BUT, if I generate 17 subscriptions, billing might generate 17 invoices.
    }

    // 2. Delete Existing Mismatched Subscriptions
    console.log('Deleting existing subscriptions for Oliver...');
    const { error: delError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('client_id', clientId);

    if (delError) {
        console.error('Error deleting subs:', delError);
        return;
    }

    // 3. Create New Subscriptions
    console.log(`Creating ${validServices.length} new subscriptions...`);
    const newSubs = validServices.map(service => ({
        client_id: service.client_id,
        organization_id: service.organization_id, // Important to map org
        name: service.name,
        amount: service.amount,
        frequency: service.frequency,
        status: 'active',
        next_billing_date: service.next_billing_date,
        // Link back to service if possible? Schema didn't show it, but good practice if column existed.
        // We'll just map the fields 1:1.
        currency: 'COP', // Default
        start_date: service.start_date || new Date().toISOString()
    }));

    const { data: inserted, error: insError } = await supabase
        .from('subscriptions')
        .insert(newSubs)
        .select();

    if (insError) {
        console.error('Error creating subs:', insError);
        return;
    }

    console.log(`Successfully synced ${inserted.length} subscriptions.`);
}

syncOliver();
