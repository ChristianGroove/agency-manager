
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
    console.log('--- 🤖 Bot Deactivation Diagnostic ---');

    // 1. Get latest execution of the test workflow
    const { data: executions, error: execError } = await supabase
        .from('workflow_executions')
        .select('*, workflows(name)')
        .eq('workflow_id', 'b0dbc242-5553-4540-9461-752e5f165d32') // The workflow we saw earlier
        .order('started_at', { ascending: false })
        .limit(1);

    if (execError || !executions || executions.length === 0) {
        console.log('No recent executions found for this workflow.');
        return;
    }

    const exec = executions[0];
    const conversationId = exec.context?.conversation?.id;
    console.log(`Latest Execution: ${exec.id} (${exec.status})`);
    console.log(`Target Conversation: ${conversationId}`);

    if (!conversationId) {
        console.log('No conversationId in execution context.');
        return;
    }

    // 2. Fetch Conversation State
    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

    if (convError || !conv) {
        console.error('Error fetching conversation:', convError);
        return;
    }

    console.log('\n--- 📝 Conversation Current State ---');
    console.log(`ID: ${conv.id}`);
    console.log(`Status: ${conv.status}`);
    console.log(`Is Bot Active: ${conv.is_bot_active}`);
    console.log(`Waiting Since: ${conv.waiting_since}`);
    console.log(`Last Message Direction: ${conv.last_message_direction}`);
    console.log(`Last Auto Reply At: ${conv.last_auto_reply_at}`);
    console.log('\nMetadata:');
    console.log(JSON.stringify(conv.metadata, null, 2));

    // 3. Check Messages to see what was the last one
    const { data: messages } = await supabase
        .from('messages')
        .select('direction, sender, content, metadata')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(2);

    console.log('\n--- 💬 Last 2 Messages ---');
    console.log(JSON.stringify(messages, null, 2));
}

diagnose();
