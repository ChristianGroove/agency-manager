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

(async () => {
    console.log('--- Inspecting Subscriptions Schema ---');
    const { data: subSample, error } = await supabase.from('subscriptions').select('service_type').limit(10);
    if (error) {
        console.error(error);
        return;
    }
    if (subSample && subSample.length > 0) {
        console.log('Valid service_types found:', [...new Set(subSample.map(s => s.service_type))]);
    } else {
        console.log('No subs found to inspect.');
    }
})();
