const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Get ID first
    const { data: c } = await supabase.from('conversations').select('id').eq('phone', '1234567890').single();
    if (!c) { console.log('No conv'); return; }

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log('Recent Messages:');
    messages.forEach(m => {
        console.log({
            id: m.id,
            direction: m.direction,
            content: m.content,
            sender: m.sender,
            created: m.created_at,
            channel: m.channel
        });
    });
}

check();
