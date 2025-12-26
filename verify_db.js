
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
    console.log('Verifying Supabase connection...');
    console.log(`URL: ${supabaseUrl}`);

    // Try to access a public table or just check health
    // The 'services' table was seen in the migration files
    const { data, error } = await supabase.from('services').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Connection failed:', error.message);
        process.exit(1);
    }

    console.log('Connection successful!');
    console.log('Services count result:', data); // data is null for head:true usually, count is in count property
    process.exit(0);
}

verifyConnection();
