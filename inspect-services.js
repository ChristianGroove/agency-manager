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

async function inspectServices() {
    console.log('--- Inspecting Services Table ---');

    const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .or('name.ilike.%Growth%,name.ilike.%Design%,name.ilike.%Diseño%');

    if (error) {
        console.error(error);
        return;
    }

    if (services && services.length > 0) {
        console.log(`Found ${services.length} services:`);
        services.forEach(s => {
            console.log(`\n[${s.id}] ${s.name}`);
            console.log(`Price: ${s.price}`);
            console.log(`Description: ${s.description}`);
            // Check if service has any client_id column or link
            console.log('Keys:', Object.keys(s));
        });
    } else {
        console.log('No services found matching names.');
    }
}

inspectServices();
