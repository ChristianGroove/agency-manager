const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkWA() {
    const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('channel', 'whatsapp')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    if (convs.length > 0) {
        const c = convs[0];
        console.log('WhatsApp Converation:');
        console.log(`ID: ${c.id}`);
        console.log(`Phone: ${c.phone}`);
        console.log(`Metadata:`, JSON.stringify(c.metadata, null, 2));
    } else {
        console.log('No WhatsApp conversations found.');
    }
}

checkWA();
