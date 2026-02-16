const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteDannicel320() {
    console.log('--- DELETE DANNICEL 320k ---');
    const invoiceId = '2b838113-d7bd-45ca-8e63-e0317974b219';

    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

    if (error) {
        console.error('Error deleting invoice:', error);
    } else {
        console.log(`Successfully deleted Invoice ${invoiceId} ($320.000)`);
    }
}

deleteDannicel320();
