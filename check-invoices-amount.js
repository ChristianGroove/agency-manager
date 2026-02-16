const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoicesByAmount() {
    console.log('--- Checking Invoices by Amount (Today) ---');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Check for 1.25M
    const { data: inv125 } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client_id, organization_id')
        .eq('total', 1250000)
        .gte('created_at', todayStart.toISOString());

    if (inv125 && inv125.length > 0) {
        console.log(`Found ${inv125.length} invoices for 1.25M:`);
        console.log(inv125);
    } else {
        console.log('No invoices for 1.25M created today.');
    }

    // Check for 445k
    const { data: inv445 } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client_id, organization_id')
        .eq('total', 445000)
        .gte('created_at', todayStart.toISOString());

    if (inv445 && inv445.length > 0) {
        console.log(`Found ${inv445.length} invoices for 445k:`);
        console.log(inv445);
    } else {
        console.log('No invoices for 445k created today.');
    }
}

checkInvoicesByAmount();
