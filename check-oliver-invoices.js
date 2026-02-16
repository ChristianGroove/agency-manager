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

async function checkInvoices() {
    console.log('--- Checking Invoices for Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, status, items')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    if (invoices && invoices.length > 0) {
        console.log(`Found ${invoices.length} invoices (Limit 10).`);
        invoices.forEach(inv => {
            console.log(`[${inv.created_at}] ${inv.number} - $${inv.total}`);
        });
    } else {
        console.log('No invoices found.');
    }
}

checkInvoices();
