const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const { data: convs, error } = await supabase
        .from('conversations')
        .select('id, channel, phone, metadata')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Recent Conversations:');
    convs.forEach(c => {
        console.log({
            id: c.id,
            channel: c.channel,
            phone: c.phone,
            metadata: JSON.stringify(c.metadata)
        });
    });
}

inspect();
