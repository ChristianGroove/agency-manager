const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDates() {
    console.log('--- Checking Oliver Service Dates ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    const { data: services } = await supabase
        .from('services')
        .select('name, next_billing_date, status')
        .eq('client_id', clientId)
        .eq('status', 'active');

    services.forEach(s => {
        console.log(`Service: ${s.name}`);
        console.log(`  Next Billing: ${s.next_billing_date}`);
    });
}

checkDates();
