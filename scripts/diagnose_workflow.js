
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectLastWorkflow() {
    console.log('--- Fetching Latest Workflow ---');
    const { data: workflows, error: wfError } = await supabase
        .from('workflows')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (wfError) {
        console.error('Error fetching workflows:', wfError);
        return;
    }

    if (!workflows || workflows.length === 0) {
        console.log('No workflows found.');
        return;
    }

    const wf = workflows[0];
    console.log(`Workflow ID: ${wf.id}`);
    console.log(`Name: ${wf.name}`);
    console.log(`Trigger Type: ${wf.trigger_type}`);
    console.log(`Trigger Config:`, JSON.stringify(wf.trigger_config, null, 2));
    console.log(`\n--- Node Definition ---`);

    const nodes = wf.definition?.nodes || [];
    const edges = wf.definition?.edges || [];

    nodes.forEach(n => {
        console.log(`[${n.type}] ID: ${n.id}`);
        if (n.type === 'buttons') {
            console.log(`   Data:`, JSON.stringify(n.data, null, 2));
        }
        if (n.type === 'trigger') {
            console.log(`   Data:`, JSON.stringify(n.data, null, 2));
        }
    });

    const report = {
        workflow: {
            id: wf.id,
            name: wf.name,
            trigger_type: wf.trigger_type,
            trigger_config: wf.trigger_config,
            nodes,
            edges
        },
        executions: []
    };

    console.log(`\n--- Recent Executions ---`);
    const { data: executions, error: execError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', wf.id)
        .order('started_at', { ascending: false })
        .limit(3);

    if (execError) console.error('Error fetching executions:', execError);

    for (const ex of executions) {
        const exData = {
            id: ex.id,
            status: ex.status,
            started_at: ex.started_at,
            completed_at: ex.completed_at,
            context: ex.context,
            logs: []
        };

        const { data: logs } = await supabase
            .from('workflow_logs')
            .select('*')
            .eq('execution_id', ex.id)
            .order('created_at', { ascending: true });

        exData.logs = logs || [];
        report.executions.push(exData);
    }

    fs.writeFileSync('diagnostic_report.json', JSON.stringify(report, null, 2));
    console.log('Report written to diagnostic_report.json');
}

inspectLastWorkflow();
