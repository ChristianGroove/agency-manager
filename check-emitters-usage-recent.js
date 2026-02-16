const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmittersUsageRecent() {
    console.log('--- Check Emitters Usage RECENT ---');
    const recent = new Date('2026-02-13T00:00:00Z');

    // Count NULLs since Feb 13
    const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .is('emitter_id', null)
        .gte('created_at', recent.toISOString());

    console.log(`NULL Emitters since Feb 13: ${count} (Error: ${error?.message})`);

    // Count Cristian Penagos since Feb 13
    const target = '714ac2a0-82c8-4410-b3f7-a38efb3a0c3b';
    const { count: countC } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('emitter_id', target)
        .gte('created_at', recent.toISOString());

    console.log(`Cristian Penagos since Feb 13: ${countC}`);
}

checkEmittersUsageRecent();
