
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function dumpConversation() {
    const conversationId = 'c097abfb-f831-469a-92b5-2a35da5f7886'; // From previous diagnostic

    console.log(`--- 🔍 Dumping Conversation ${conversationId} ---`);
    const { data: conv, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

    if (error) {
        console.error('Error fetching conversation:', error);
        return;
    }

    console.log(JSON.stringify(conv, null, 2));

    console.log('\n--- 💬 Last 5 Messages ---');
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(JSON.stringify(messages, null, 2));
}

dumpConversation();
