
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDomainEvents() {
    console.log('Checking domain_events table...');

    const { data, error, count } = await supabase
        .from('domain_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching domain events:', error.message);
        process.exit(1);
    }

    console.log(`Found ${count} total events.`);
    if (data && data.length > 0) {
        console.log('Latest 5 events:');
        data.forEach(event => {
            console.log(`[${event.created_at}] Type: ${event.event_type}, Schema: ${event.entity_schema}, ID: ${event.entity_id}`);
            console.log('Metadata:', JSON.stringify(event.metadata));
            console.log('---');
        });
    } else {
        console.log('No events found in domain_events table.');
    }
}

checkDomainEvents();
