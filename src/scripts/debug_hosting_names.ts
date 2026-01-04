
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkServices() {
    console.log("Checking services...");
    const { data: services, error } = await supabase
        .from('services')
        .select('id, name, description, amount');

    if (error) {
        console.error("Error fetching services:", error);
        return;
    }

    console.log(`Found ${services.length} services.`);
    console.log("Names:");
    services.forEach(s => console.log(`- ${s.name} (Amount: ${s.amount})`));

    // Check hosting accounts
    const { data: accounts, error: accError } = await supabase
        .from('hosting_accounts')
        .select('*');

    if (accError) {
        console.error("Error fetching accounts:", accError);
    } else {
        console.log(`Found ${accounts.length} hosting accounts.`);
        accounts.forEach(a => console.log(`- Account: ${a.domain_url} (Plan: ${a.plan_name})`));
    }
}

checkServices();
