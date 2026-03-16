
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // Get columns of 'leads' table
    // Since we don't have direct access to information_schema via RPC usually, we can try to select * limit 1
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching lead sample:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in leads table:', Object.keys(data[0]));
    } else {
         console.log('Leads table is empty, trying to find another way to see columns');
    }
}

checkSchema();
