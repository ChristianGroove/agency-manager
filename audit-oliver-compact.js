const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOliverCompact() {
    console.log('--- AUDIT: Oliver Compact (f99...) ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';

    // Get Invoices Today/Recent
    const today = new Date();
    today.setDate(today.getDate() - 2);

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, date, items, billing_cycle_id')
        .eq('client_id', clientId)
        .gte('created_at', today.toISOString());

    console.log(`Found ${invoices.length} recent invoices.`);
    invoices.forEach(i => {
        const desc = i.items[0]?.description || 'No Desc';
        console.log(`[${desc}] $${i.total} | ${i.number} | ID: ${i.id}`);
    });
}

auditOliverCompact();
