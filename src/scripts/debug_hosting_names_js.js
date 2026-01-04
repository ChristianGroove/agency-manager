const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Manually load .env if needed
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing ENV variables");
    console.log("URL:", supabaseUrl);
    console.log("KEY:", supabaseServiceKey ? "Loaded" : "Missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkServices() {
    try {
        console.log("Checking services...");
        const { data: services, error } = await supabase
            .from('services')
            .select('id, name, description, amount')
            .limit(50);

        if (error) {
            console.error("Error fetching services:", error);
        } else {
            console.log(`Found ${services.length} services.`);
            console.log("Service Names:");
            services.forEach(s => console.log(`- ${s.name}`));
        }

        // Check hosting accounts
        console.log("\nChecking hosting accounts...");
        const { data: accounts, error: accError } = await supabase
            .from('hosting_accounts')
            .select('*');

        if (accError) {
            console.error("Error fetching accounts:", accError);
        } else {
            console.log(`Found ${accounts.length} hosting accounts.`);
            accounts.forEach(a => console.log(`- Account: ${a.domain_url} (Plan: ${a.plan_name})`));
        }
    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

checkServices();
