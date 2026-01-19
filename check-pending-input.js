const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPending() {
    console.log('Checking pending inputs for recent conversations...');

    // 1. Get recent conversations
    const { data: convs } = await supabase
        .from('conversations')
        .select('id, phone, connection_id')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (!convs || convs.length === 0) {
        console.log('No recent conversations found.');
        return;
    }

    // 2. Check pending inputs for these
    for (const conv of convs) {
        const { data: pending } = await supabase
            .from('workflow_pending_inputs')
            .select('*')
            .eq('conversation_id', conv.id)
            .eq('status', 'waiting');

        console.log(`\nConversation: ${conv.id} (${conv.phone})`);
        if (pending && pending.length > 0) {
            console.log(`⚠️ FOUND ${pending.length} PENDING INPUTS (Blocking new triggers?):`);
            console.log(JSON.stringify(pending, null, 2));
        } else {
            console.log('✅ No pending inputs.');
        }
    }
}

checkPending();
