const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalCheck() {
    console.log('--- Final Check for Oliver Invoices (Today) ---');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, number, total, created_at')
        .eq('client_id', clientId)
        .gte('created_at', todayStart.toISOString());

    if (invoices && invoices.length > 0) {
        console.log(`Found ${invoices.length} invoices:`);
        invoices.forEach(inv => {
            console.log(`- ${inv.number}: $${inv.total} (${inv.created_at})`);
        });
    } else {
        console.log('No invoices found.');
    }
}

finalCheck();
