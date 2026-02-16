const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLiliana() {
    console.log('--- Fixing Liliana Melo Murillo ---');

    // Find client
    const { data: client } = await supabase.from('clients').select('id, organization_id').ilike('name', '%Liliana Melo%').single();
    if (!client) return console.log('Client not found');

    const clientId = client.id;

    // Get the problematic service
    const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .ilike('name', '%CRM Empresarial%')
        .single();

    if (!service) return console.log('Service not found');

    console.log(`Service found: ${service.name} ($${service.amount})`);
    console.log(`  Start Date: ${service.service_start_date}`);
    console.log(`  Next Bill: ${service.next_billing_date}`);

    // Check if subscription exists
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .ilike('name', '%CRM Empresarial%')
        .maybeSingle();

    if (sub) {
        console.log(`Subscription EXISTS: ${sub.id}`);
        console.log(`  Next Bill: ${sub.next_billing_date}`);
        console.log(`  Status: ${sub.status}`);

        // If it exists but date is wrong (e.g. future), reset it?
        // If status is cancelled, reactivate?
        if (sub.status !== 'active') {
            console.log('  Reactivating subscription...');
            await supabase.from('subscriptions').update({ status: 'active' }).eq('id', sub.id);
        }

        // Reset Date to allow catch-up
        // Service start was Dec 14. First bill Jan 14. Second Feb 14.
        // If last invoice was Dec 18 (Inv 1), then next bill should be JAN 14.
        const targetDate = '2026-01-14T00:00:00.000Z';
        console.log(`  Resetting Next Billing Date to: ${targetDate}`);

        await supabase
            .from('subscriptions')
            .update({ next_billing_date: targetDate })
            .eq('id', sub.id);

    } else {
        console.log('Subscription MISSING. Creating one...');

        const targetDate = '2026-01-14T00:00:00.000Z'; // Force past date to trigger catch-up

        const { error } = await supabase.from('subscriptions').insert({
            organization_id: client.organization_id,
            client_id: clientId,
            name: service.name,
            amount: service.amount,
            currency: 'COP', // Assumption
            frequency: service.frequency || 'monthly',
            status: 'active',
            next_billing_date: targetDate,
            created_at: new Date().toISOString(),
            metadata: { created_by: 'fix_script' }
        });

        if (error) console.error('Error creating sub:', error);
        else console.log('Subscription created.');
    }
}

fixLiliana();
