const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('conversations')
        .select('id, channel, connection_id, created_at, phone')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        fs.writeFileSync('convs.json', JSON.stringify(error, null, 2));
    } else {
        fs.writeFileSync('convs.json', JSON.stringify(data, null, 2));
    }
}

run();
