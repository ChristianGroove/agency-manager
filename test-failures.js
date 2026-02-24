const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFailures() {
    const { data: execs, error } = await supabase
        .from('workflow_executions')
        .select(`id, workflow_id, status, error_message, created_at`)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Query Error:', error);
        return;
    }

    console.log(`\nFound ${execs?.length || 0} executions.`);
    execs?.forEach(e => {
        console.log(`[${e.created_at}] WF: ${e.workflow_id} | Status: ${e.status} | Error: ${e.error_message || 'None'}`);
    });
}

checkFailures().catch(console.error);
