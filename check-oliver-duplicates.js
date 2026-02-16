const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    console.log('--- Checking Duplicate Cycles (Oliver) ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // Services
    const { data: services } = await supabase.from('services').select('id, name').eq('client_id', clientId);
    const serviceMap = {};
    services.forEach(s => serviceMap[s.id] = s.name);
    const serviceIds = services.map(s => s.id);

    // Cycles
    const { data: cycles } = await supabase
        .from('billing_cycles')
        .select('*')
        .in('service_id', serviceIds)
        .order('start_date', { ascending: false });

    // Group by Service
    const grouped = {};
    cycles.forEach(c => {
        if (!grouped[c.service_id]) grouped[c.service_id] = [];
        grouped[c.service_id].push(c);
    });

    Object.keys(grouped).forEach(sid => {
        console.log(`\nService: ${serviceMap[sid]} (${sid})`);
        const serviceCycles = grouped[sid];

        // Check for duplicates (same start date month/year)
        const seen = new Set();
        serviceCycles.forEach(c => {
            const startDate = new Date(c.start_date);
            const key = `${startDate.getFullYear()}-${startDate.getMonth()}`; // Month key

            const isDuplicate = seen.has(key);
            seen.add(key);

            console.log(`  [${isDuplicate ? 'DUPLICATE' : 'OK'}] ${c.start_date.split('T')[0]} -> ${c.end_date.split('T')[0]} | Inv: ${c.invoice_id} | ID: ${c.id}`);

            if (isDuplicate) {
                console.log(`     -> MARK FOR DELETION: ${c.id}`);
            }
        });
    });
}

checkDuplicates();
