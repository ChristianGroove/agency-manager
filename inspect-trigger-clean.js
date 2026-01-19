const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: w } = await supabase
        .from('workflows')
        .select('id, name, trigger_type, trigger_config')
        .eq('id', '9863b9c9-d828-4dc8-8f91-68c4b8acf242')
        .single();

    if (w) {
        console.log('--- START CONFIG ---');
        console.log(JSON.stringify(w.trigger_config, null, 2));
        console.log('--- END CONFIG ---');
    }
}

check();
