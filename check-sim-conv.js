const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('phone', '1234567890');

    if (error) { console.error(error); return; }
    console.log('Conversations for 1234567890:', convs.length);
    if (convs.length > 0) console.log(convs[0]);
}

check();
