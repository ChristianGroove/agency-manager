const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLilianaAllServices() {
    console.log('--- AUDIT: Liliana All Services ---');
    const clientId = '95e7f87f-d209-44d6-8b33-497b06c72a51';

    // Fetch ALL Services (no status filter)
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    console.log(`Found ${services.length} Total Services:`);

    services.forEach(s => {
        console.log(`\nID: ${s.id}`);
        console.log(`Name: ${s.name}`);
        console.log(`Status: ${s.status}`);
        console.log(`Amount: $${s.amount}`);
        console.log(`Created: ${s.created_at}`);
        console.log(`Deleted: ${s.deleted_at}`);
    });
}

auditLilianaAllServices();
