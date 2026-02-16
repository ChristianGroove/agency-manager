const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmittersUsageJson() {
    const c1 = '714ac2a0-82c8-4410-b3f7-a38efb3a0c3b'; // Penagos
    const c2 = '6b497ad1-e57b-4e71-9aba-35218d1ab624'; // Gomez p.
    const k1 = '9d2279b1-8b53-4086-a24a-c621f3cc4d66'; // Karla

    // Count C1
    const { count: count1 } = await supabase.from('invoices').select('id', { count: 'exact' }).eq('emitter_id', c1);
    const { count: count2 } = await supabase.from('invoices').select('id', { count: 'exact' }).eq('emitter_id', c2);
    const { count: count3 } = await supabase.from('invoices').select('id', { count: 'exact' }).eq('emitter_id', k1);
    const { count: countNull } = await supabase.from('invoices').select('id', { count: 'exact' }).is('emitter_id', null);

    console.log(JSON.stringify({
        'Cristian Penagos': count1,
        'Cristian Gomez p': count2,
        'Karla': count3,
        'NULL': countNull
    }));
}

checkEmittersUsageJson();
