const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSubsDates() {
    console.log('--- Debugging Subscription Dates (Global) ---');
    const today = new Date();

    // 1. Get Active Services (UI Source)
    const { data: services } = await supabase
        .from('services')
        .select('id, name, client_id, next_billing_date, client:clients(name)')
        .eq('status', 'active');

    // 2. Get Active Subscriptions (Billing Source)
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('id, name, client_id, next_billing_date')
        .eq('status', 'active');

    const subMap = {}; // Key: client_id + name
    subs.forEach(s => {
        subMap[`${s.client_id}|${s.name}`] = s;
    });

    console.log(`Checking ${services.length} services against ${subs.length} subscriptions...`);

    services.forEach(svc => {
        const sub = subMap[`${svc.client_id}|${svc.name}`];

        let status = 'OK';
        let msg = '';

        if (!sub) {
            status = 'MISSING_SUB';
            msg = 'No matching subscription found!';
        } else {
            const svcDate = svc.next_billing_date ? new Date(svc.next_billing_date).toISOString().split('T')[0] : 'NULL';
            const subDate = sub.next_billing_date ? new Date(sub.next_billing_date).toISOString().split('T')[0] : 'NULL';

            if (svcDate !== subDate) {
                status = 'MISMATCH';
                msg = `Service says ${svcDate} | Sub says ${subDate}`;
            } else {
                // Check if overdue?
                if (sub.next_billing_date && new Date(sub.next_billing_date) <= today) {
                    status = 'OVERDUE';
                    msg = `Both assume ${subDate} (Which is past!)`;
                }
            }
        }

        if (status !== 'OK') {
            console.log(`[${status}] ${svc.client?.name} - ${svc.name}`);
            console.log(`    ${msg}`);
        }
    });
}

debugSubsDates();
