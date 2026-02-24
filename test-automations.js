const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAutomations() {
    const { data: workflows } = await supabase
        .from('workflows')
        .select('*')
        .eq('is_active', true);

    console.log(`Found ${workflows?.length} active workflows.`);

    workflows?.forEach(wf => {
        const config = wf.trigger_config;
        console.log(`\nWorkflow: ${wf.name} (${wf.id})`);
        console.log(`Trigger Type: ${wf.trigger_type}`);
        console.log(`Config Channels:`, config.channels);

        if (config.channels) {
            console.log(`Is Array? ${Array.isArray(config.channels)}`);
            if (Array.isArray(config.channels)) {
                config.channels.forEach(ch => {
                    console.log(`  - ${typeof ch}: ${ch}`);
                });
            }
        }
    });
}

testAutomations().catch(console.error);
