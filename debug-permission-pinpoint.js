
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermission() {
    const { data: leads } = await supabase
        .from('leads')
        .select('id, phone')
        .ilike('name', '%Christian Groove%');

    if (!leads || leads.length === 0) return;
    const leadId = leads[0].id;

    const { data: conv } = await supabase
        .from('conversations')
        .select('id, metadata')
        .eq('lead_id', leadId)
        .eq('state', 'active')
        .single();

    if (!conv) return;

    console.log('CONVERSATION_ID:', conv.id);
    console.log('CALL_PERMISSIONS:', JSON.stringify(conv.metadata?.call_permissions || [], null, 2));

    const { data: msgs } = await supabase
        .from('messages')
        .select('direction, content, buttonId, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('LATEST_MESSAGES_LOG:');
    msgs.forEach(m => {
        console.log(`[${m.created_at}] ${m.direction}: ${JSON.stringify(m.content)} | buttonId: ${m.buttonId}`);
    });
}

checkPermission();
