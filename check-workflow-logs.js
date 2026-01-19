const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLogs() {
    const executionId = '774715a0-e31c-4359-a371-37f6ef497baa'; // Latest completed
    console.log(`Checking logs for execution: ${executionId}`);

    const { data: logs, error } = await supabase
        .from('workflow_logs')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log('No logs found for this execution.');
        return;
    }

    logs.forEach(log => {
        console.log(`[${log.level}] Node ${log.node_id}: ${log.message}`);
        if (log.details) console.log('Details:', JSON.stringify(log.details));
    });
}

checkLogs();
