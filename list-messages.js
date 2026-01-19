
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('id, sender, channel, direction, metadata, conversation_id, created_at')
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }
    console.log("--- 🗨️ RECENT INBOUND MESSAGES ---");
    messages.forEach(m => {
        console.log(`[${m.created_at}] From: ${m.sender} | Convo: ${m.conversation_id}`);
        console.log(`Metadata: ${JSON.stringify(m.metadata || {})}`);
        console.log('-------------------');
    });
}
run();
