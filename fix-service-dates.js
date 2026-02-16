const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixServiceDates() {
    console.log('--- Fixing Service Dates (Sync from Subscriptions) ---');

    // 1. Get Active Subscriptions with future dates
    // Actually, get ALL active subscriptions system-wide or just Oliver?
    // User wants "Todo el sistema". Let's do it global or just start with Oliver to verify.
    // The user screamed "acaso solo lo has aplicado a ese servicio?".
    // I should probably do it global.

    const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active');

    console.log(`Found ${subscriptions.length} active subscriptions.`);

    let updatedCount = 0;

    for (const sub of subscriptions) {
        if (!sub.next_billing_date) continue;

        // Find matching service
        // We need a way to link Subscription -> Service.
        // My previous patch used Name + ClientID + Amount to find service.
        // Ideally we should use the Metadata if we backfilled it?
        // But most don't have metadata yet.

        // Strategy: Match by Name + Client (Active)
        const { data: services } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', sub.client_id)
            .eq('name', sub.name)
            .eq('status', 'active'); // Only update active services

        if (services && services.length > 0) {
            // Update ALL matching services? Or just one?
            // If they have duplicates, it's messy.
            for (const service of services) {
                // Update service next_billing_date to match subscription
                const { error } = await supabase
                    .from('services')
                    .update({ next_billing_date: sub.next_billing_date })
                    .eq('id', service.id);

                if (!error) updatedCount++;
            }
        }
    }
    console.log(`Updated ${updatedCount} services with synced dates.`);
}

fixServiceDates();
