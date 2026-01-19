const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDef() {
    const { data: w } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', '9863b9c9-d828-4dc8-8f91-68c4b8acf242')
        .single();

    if (w) {
        console.log('Definition Nodes:', JSON.stringify(w.definition.nodes, null, 2));
    }
}

checkDef();
