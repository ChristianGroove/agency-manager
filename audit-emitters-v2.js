const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditEmittersV2() {
    console.log('--- AUDIT: Emitters V2 ---');

    // 1. Inspect Emitter Columns
    const { data: sampleEmitter } = await supabase.from('emitters').select('*').limit(1);
    if (sampleEmitter && sampleEmitter.length > 0) {
        console.log('Emitter Columns:', Object.keys(sampleEmitter[0]));
        console.log('Sample Name Check:', sampleEmitter[0].name, sampleEmitter[0].legal_name, sampleEmitter[0].business_name);
    }

    // 2. List All Emitters with suspected name columns
    const { data: emitters } = await supabase.from('emitters').select('*');
    if (emitters) {
        console.log(`\nFound ${emitters.length} emitters:`);
        emitters.forEach(e => {
            const name = e.name || e.legal_name || e.business_name || 'Unknown';
            console.log(`  - [${e.id}] ${name} (Org: ${e.organization_id})`);
        });
    }

    // 3. Check Invoice Emitter ID (Wider Window)
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, emitter_id, created_at')
        .gte('created_at', recent.toISOString())
        .limit(5);

    console.log(`\nRecent Invoices Sample:`);
    invoices.forEach(i => {
        console.log(`  Inv: ${i.number} | Emitter: ${i.emitter_id}`);
    });
}

auditEmittersV2();
