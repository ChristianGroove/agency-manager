const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking briefing tables...');

    // Check 'briefings' table
    const { data: briefings, error: briefingsError } = await supabase
        .from('briefings')
        .select('*')
        .limit(1);

    if (briefingsError) {
        console.error("❌ Error accessing 'briefings' table:", briefingsError.message);
    } else {
        console.log("✅ 'briefings' table exists. Count rows:", briefings.length);
    }

    // Check 'briefing_templates' table
    const { data: templates, error: templatesError } = await supabase
        .from('briefing_templates')
        .select('*')
        .limit(1);

    if (templatesError) {
        console.error("❌ Error accessing 'briefing_templates' table:", templatesError.message);
    } else {
        console.log("✅ 'briefing_templates' table exists. Count rows:", templates.length);
    }

    // Check 'briefing_responses' table
    const { data: responses, error: responsesError } = await supabase
        .from('briefing_responses')
        .select('*')
        .limit(1);

    if (responsesError) {
        console.error("❌ Error accessing 'briefing_responses' table:", responsesError.message);
    } else {
        console.log("✅ 'briefing_responses' table exists. Count rows:", responses.length);
    }
}

checkTables();
