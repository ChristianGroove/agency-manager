const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOverdue() {
    console.log('--- GLOBAL AUDIT: Overdue Services ---');
    const today = new Date();

    // Get ALL active services
    const { data: services } = await supabase
        .from('services')
        .select('id, name, amount, next_billing_date, client_id, client:clients(name)')
        .eq('status', 'active');

    let overdueCount = 0;

    for (const s of services) {
        if (!s.next_billing_date) continue;
        const date = new Date(s.next_billing_date);

        // precise comparison
        if (date <= today) {
            console.log(`[OVERDUE] ${s.client?.name} - ${s.name}`);
            console.log(`    Date: ${s.next_billing_date} ($${s.amount})`);
            overdueCount++;
        }
    }

    console.log(`\nTotal Overdue Services: ${overdueCount}`);
}

auditOverdue();
