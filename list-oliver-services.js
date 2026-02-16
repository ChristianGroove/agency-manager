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

async function listClientServices() {
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5'; // Oliver
    console.log(`--- Listing Services for Oliver (${clientId}) ---`);

    const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId);

    if (error) {
        console.error(error);
        return;
    }

    if (services && services.length > 0) {
        console.log(`Found ${services.length} services for Oliver:`);
        services.forEach(s => {
            console.log(`\nSERVICE: ${s.name}`);
            console.log(`  ID: ${s.id}`);
            console.log(`  Amount: ${s.amount}`);
            console.log(`  Frequency: ${s.frequency}`);
            console.log(`  Next Billing: ${s.next_billing_date}`);
            console.log(`  Status: ${s.status}`);
        });
    } else {
        console.log('No services found.');
    }
}

listClientServices();
