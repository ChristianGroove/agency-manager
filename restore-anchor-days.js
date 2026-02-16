const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreAnchorDays() {
    console.log('--- Restoring Anchor Billing Days (Oliver) v2 ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';
    const today = new Date();

    // 1. Get Matching Services & Subscriptions
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active');

    console.log(`Found ${services.length} active services.`);

    for (const service of services) {
        // PRIORITIZE service_start_date over created_at
        const anchorSource = service.service_start_date || service.created_at;
        if (!anchorSource) continue;

        const anchorDate = new Date(anchorSource);
        const anchorDay = anchorDate.getUTCDate();

        console.log(`\nService: ${service.name}`);
        console.log(`  Anchor Source: ${anchorSource} (Day: ${anchorDay})`);

        // Determine correct Next Billing Date
        // It should be the upcoming month's anchor day.

        const currentMonthAttempt = new Date(); // Today

        // Set to this month's anchor day
        // Special handle for 29,30,31? JS auto-rolls over.
        // e.g. Feb 30 -> Mar 2.
        // For now assume standard days.

        let finalDate = new Date();
        finalDate.setUTCDate(anchorDay);

        // If the resulting date is in the past (e.g. today is Feb 14, Anchor is 6 -> Feb 6 < Feb 14)
        // Then we must move to NEXT month (Mar 6).
        // If resulting date is future (e.g. Anchor is 20 -> Feb 20 > Feb 14)
        // Then keep this month.

        if (finalDate < today) {
            finalDate.setMonth(finalDate.getMonth() + 1);
        }

        // Ensure day is correct (in case setMonth shifted due to 31st)
        // Re-force day if possible, or handle end-of-month logic.
        // For simple fix now:
        const checkDay = finalDate.getUTCDate();
        if (checkDay !== anchorDay) {
            // We rolled over (e.g. Jan 31 -> Feb 28 -> Mar 31)
            // Fix to last day of month?
            // Not needed for Oliver (Day 6, 12, 14).
            console.log('  [Info] Day shift detected (Feb 28 issue?), strictly forcing day.');
            finalDate.setUTCDate(anchorDay);
        }

        console.log(`  Current Next: ${service.next_billing_date}`);
        console.log(`  Restored Next: ${finalDate.toISOString()}`);

        // Update SERVICE
        await supabase
            .from('services')
            .update({ next_billing_date: finalDate.toISOString() })
            .eq('id', service.id);

        // Update SUBSCRIPTION
        const { data: subCheck } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('client_id', clientId)
            .eq('name', service.name)
            .maybeSingle();

        if (subCheck) {
            await supabase
                .from('subscriptions')
                .update({ next_billing_date: finalDate.toISOString() })
                .eq('id', subCheck.id);
            console.log(`  [Synced] Subscription updated.`);
        } else {
            console.log(`  [Warning] No matching subscription found.`);
        }
    }
}

restoreAnchorDays();
