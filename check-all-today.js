const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllToday() {
    console.log('--- Checking ALL Invoices Created Today ---');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client_id, client:clients(name)')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    if (invoices && invoices.length > 0) {
        console.log(`Found ${invoices.length} invoices created today:`);
        invoices.forEach(inv => {
            console.log(`[${inv.created_at}] ${inv.number} - $${inv.total} - Client: ${inv.client?.name || inv.client_id}`);
        });
    } else {
        console.log('No invoices created today.');
    }
}

checkAllToday();
