const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log('--- Inspecting Billing Cycles Schema ---');
    const { data: cycles, error } = await supabase.from('billing_cycles').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (cycles && cycles.length > 0) {
        console.log('Sample Cycle:', cycles[0]);
    } else {
        console.log('No cycles found. Trying to infer columns from error or just guessing based on previous code.');
        // We can't easily infer columns if table is empty without introspection, but we saw them in the frontend code:
        // id, service_id, invoice_id, start_date, end_date, amount, status
    }
})();
