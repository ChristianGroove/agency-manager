
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load sandbox env
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.sandbox')));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing sandbox credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking "services" table schema...');

    // Attempt to select organization_id
    const { data, error } = await supabase
        .from('services')
        .select('id, organization_id')
        .limit(1);

    if (error) {
        console.error('❌ Error accessing organization_id:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('Diagnosis: The column "organization_id" is definitely missing from "services".');
        }
    } else {
        console.log('✅ "organization_id" exists in "services".');
        console.log('Sample data:', data);
    }
}

checkSchema();
