const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    try {
        const { data, error } = await supabase.from('system_modules').select('*');
        if (error) throw error;
        console.log('JSON_START');
        console.log(JSON.stringify(data));
        console.log('JSON_END');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
