const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDefinition() {
    const workflowId = '9863b9c9-d828-4dc8-8f91-68c4b8acf242';
    console.log(`Checking definition for workflow: ${workflowId}`);

    // Fetch raw row first to check structure
    const { data: wf, error } = await supabase
        .from('workflows')
        .select(`name, definition`)
        .eq('id', workflowId)
        .single();

    if (error) {
        console.error('Error fetching workflow:', error);
        return;
    }

    // Inspect Definition Object
    const def = wf.definition;

    if (!def) {
        console.log('❌ Definition is NULL');
        return;
    }

    console.log('Definition Type:', typeof def);
    console.log('Is Array?', Array.isArray(def));
    console.log('Keys:', Object.keys(def));

    // Check Nodes
    const nodes = def.nodes;
    if (!nodes) {
        console.log('❌ "nodes" property MISSING in definition');
        return;
    }

    console.log(`✅ Found ${nodes.length} Nodes:`);
    nodes.forEach(n => {
        console.log(` - [${n.type}] ${n.id} (Ref: ${n.data?.stepId || 'N/A'})`);
        if (n.type === 'action') {
            console.log(`   Action Type: ${n.data?.actionType}`);
            console.log(`   Config: ${JSON.stringify(n.data?.config, null, 2)}`);
        }
    });

    // Check Edges
    const edges = def.edges;
    console.log(`✅ Found ${edges?.length || 0} Edges`);
}

checkDefinition();
