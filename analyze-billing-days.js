const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeBillingDays() {
    console.log('--- Analyzing Billing Anchor Days for Oliver ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // 1. Get Services with created_at
    const { data: services } = await supabase
        .from('services')
        .select('id, name, amount, created_at, next_billing_date, status')
        .eq('client_id', clientId)
        .eq('status', 'active');

    console.log(`\n--- Active Services (${services.length}) ---`);
    services.forEach(s => {
        const created = new Date(s.created_at);
        const currentNext = new Date(s.next_billing_date);
        console.log(`Service: ${s.name} ($${s.amount})`);
        console.log(`  Created: ${s.created_at} (Day: ${created.getUTCDate()})`);
        console.log(`  Current Next: ${s.next_billing_date} (Day: ${currentNext.getUTCDate()})`);
        console.log(`  ID: ${s.id}`);
    });
}

analyzeBillingDays();
