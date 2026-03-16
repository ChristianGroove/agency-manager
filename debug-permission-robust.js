
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
    try {
        console.log('Searching for "Aceptar Llamada" messages...');
        const { data: msgs, error: msgErr } = await supabase
            .from('messages')
            .select('conversation_id, content, metadata, created_at')
            .ilike('content->>text', '%Aceptar Llamada%')
            .order('created_at', { ascending: false })
            .limit(10);

        if (msgErr) throw msgErr;

        if (!msgs || msgs.length === 0) {
            console.log('No "Aceptar Llamada" messages found.');
            return;
        }

        console.log(`Found ${msgs.length} messages.`);
        
        for (const m of msgs) {
            console.log(`--- Msg: ${m.created_at} | Conv: ${m.conversation_id} ---`);
            console.log(`  Button ID in metadata: "${m.metadata?.buttonId}"`);
            
            const { data: conv } = await supabase
                .from('conversations')
                .select('id, metadata')
                .eq('id', m.conversation_id)
                .single();
            
            console.log('  Conv Metadata Permissions:', JSON.stringify(conv?.metadata?.call_permissions || [], null, 2));
        }
    } catch (e) {
        console.error('ERROR:', e);
    }
}

checkMessages();
