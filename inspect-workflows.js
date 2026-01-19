const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectWorkflows() {
    const { data: workflows, error } = await supabase
        .from('workflows')
        .select('id, name, is_active, trigger_type, trigger_config')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${workflows.length} workflows.`);
    workflows.forEach(w => {
        console.log(`\nID: ${w.id}`);
        console.log(`Name: ${w.name}`);
        console.log(`Active: ${w.is_active}`);
        console.log(`Trigger Type: '${w.trigger_type}'`); // Critical check
        console.log(`Config:`, w.trigger_config);
    });
}

inspectWorkflows();
