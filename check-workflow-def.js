const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDefinition() {
    const workflowId = '9863b9c9-d828-4dc8-8f91-68c4b8acf242';
    console.log(`Checking definition for workflow: ${workflowId}`);

    const { data: wf, error } = await supabase
        .from('workflows')
        .select(`
            name,
            definition,
            trigger_config
        `)
        .eq('id', workflowId)
        .single();

    if (error) {
        console.error('Error fetching workflow:', error);
        return;
    }

    console.log(`\nWorkflow Name: ${wf.name}`);
    console.log(`Trigger Config: ${JSON.stringify(wf.trigger_config, null, 2)}`);
    console.log(`\nDefinition Nodes:`);

    const def = wf.definition; // JSON object
    if (!def || !def.nodes) {
        console.log('⚠️ NO NODES FOUND IN DEFINITION');
        return;
    }

    def.nodes.forEach(node => {
        console.log(`\n[${node.type}] ${node.id} (${node.userData?.label || 'No Label'})`);
        console.log(`Data: ${JSON.stringify(node.data, null, 2)}`);
    });
}

checkDefinition();
