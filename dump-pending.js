const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: inputs } = await supabase
        .from('workflow_pending_inputs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    fs.writeFileSync('test-wf-pending.json', JSON.stringify(inputs, null, 2));
}

run();
