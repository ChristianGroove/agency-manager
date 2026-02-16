const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('--- Checking Columns for billing_cycles ---');
    // We can't query information_schema directly with supabase-js easily unless we use rpc or have permissions.
    // Instead, we try to insert a dummy record with 'invoice_id' and see if it errors, OR just select 'invoice_id' specifically.

    const { data, error } = await supabase.from('billing_cycles').select('invoice_id').limit(1);

    if (error) {
        console.error('Column check failed:', error.message);
    } else {
        console.log('Column invoice_id EXISTS.');
    }
}

checkColumns();
