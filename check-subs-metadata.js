const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubsMetadata() {
    console.log('--- Checking Metadata for subscriptions ---');
    const { data: subs, error } = await supabase.from('subscriptions').select('metadata').limit(1);

    if (error) {
        console.error('Column check failed:', error.message);
    } else {
        console.log('Column metadata EXISTS.');
    }
}

checkSubsMetadata();
