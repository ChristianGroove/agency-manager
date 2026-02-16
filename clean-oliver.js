const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanOliverToday() {
    console.log('--- Emergency Cleanup: Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Delete Invoices Created Today
    const { data: deleted, error } = await supabase
        .from('invoices')
        .delete()
        .eq('client_id', clientId)
        .gte('created_at', todayStart.toISOString())
        .select();

    if (error) {
        console.error('Error deleting invoices:', error);
    } else {
        console.log(`Deleted ${deleted.length} invoices created today.`);
        deleted.forEach(d => console.log(` - Deleted (${d.total}) ${d.number}`));
    }
}

cleanOliverToday();
