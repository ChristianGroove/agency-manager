const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCycles() {
    console.log('--- Checking Billing Cycles for Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // Get services first
    const { data: services } = await supabase.from('services').select('id, name').eq('client_id', clientId);
    const serviceIds = services.map(s => s.id);

    // Get cycles
    const { data: cycles } = await supabase
        .from('billing_cycles')
        .select('*')
        .in('service_id', serviceIds)
        .gte('start_date', '2026-01-01')
        .order('start_date', { ascending: false });

    console.log(`Found ${cycles.length} cycles.`);
    cycles.forEach(c => {
        console.log(`[${c.start_date} - ${c.end_date}] Status: ${c.status} | Amount: ${c.amount}`);
    });
}

checkCycles();
