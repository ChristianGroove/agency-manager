const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditEmitters() {
    console.log('--- AUDIT: Emitters ---');

    // 1. Get Emitters
    // Try 'emitters' table
    const { data: emitters, error } = await supabase.from('emitters').select('*');
    if (error) {
        console.log('Error fetching emitters:', error.message);
    } else {
        console.log(`Found ${emitters.length} emitters:`);
        emitters.forEach(e => {
            console.log(`  - [${e.id}] ${e.name} (Org: ${e.organization_id})`);
        });
    }

    // 2. Check Invoices Columns (via a sample)
    console.log('\nChecking Invoice Emitter link...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: invoices } = await supabase
        .from('invoices')
        .select('*') // Select all to see columns
        .gte('created_at', today.toISOString())
        .limit(1);

    if (invoices && invoices.length > 0) {
        const inv = invoices[0];
        console.log('Sample Invoice columns keys:', Object.keys(inv));
        console.log('emitter_id:', inv.emitter_id);
    } else {
        console.log('No invoices found today to check columns.');
    }
}

auditEmitters();
