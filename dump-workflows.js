const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: execs } = await supabase
        .from('workflow_executions')
        .select('id, context, started_at')
        .in('id', ['0c5619f8-f1e7-43df-9ed1-63e09f0b95cd', 'cc480499-b56f-49f8-a7d3-e75086a6d5a7', '0467453b-24b0-46e7-8039-36e97bf891f9', 'f860a5c6-6b55-45f9-b419-613f7e47a0a3'])
        .order('started_at', { ascending: true });

    fs.writeFileSync('test-wf-contexts.json', JSON.stringify(execs, null, 2));
}

run();
