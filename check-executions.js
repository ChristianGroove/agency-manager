const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkExecutions() {
    console.log('Checking recent workflow executions...');

    // Fetch last 5 executions
    const { data: executions, error } = await supabase
        .from('workflow_executions')
        .select(`
            id,
            status,
            started_at,
            completed_at,
            error_message,
            workflow_id,
            context
        `)
        .order('started_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching executions:', error);
        return;
    }

    if (!executions || executions.length === 0) {
        console.log('No executions found in the last few minutes.');
        return;
    }

    console.log(`Found ${executions.length} recent executions:`);
    executions.forEach(exec => {
        console.log(`\nID: ${exec.id}`);
        console.log(`Status: ${exec.status}`);
        console.log(`Time: ${exec.started_at}`);
        console.log(`Workflow ID: ${exec.workflow_id}`);
        if (exec.status === 'failed') {
            console.log(`❌ ERROR: ${exec.error_message}`);
        }
        console.log(`Context Message: "${exec.context?.message?.text}"`);
    });
}

checkExecutions();
