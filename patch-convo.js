
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const targetPhone = '3248322720';
    console.log(`--- 🩹 PATCHING CONVERSATION FOR ${targetPhone} ---`);

    // 1. Find the last message from this phone to get the phoneNumberId
    const { data: messages } = await supabase
        .from('messages')
        .select('metadata, conversation_id')
        .eq('direction', 'inbound')
        .ilike('sender', `%${targetPhone}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!messages || messages.length === 0) {
        console.log("❌ No inbound messages found for this phone.");
        return;
    }

    const msgMetadata = messages[0].metadata;
    const pId = msgMetadata?.metadata?.phoneNumberId || msgMetadata?.phoneNumberId;
    const convId = messages[0].conversation_id;

    if (!pId) {
        console.log("❌ Could not find phoneNumberId in message metadata:", JSON.stringify(msgMetadata));
        return;
    }

    console.log(`🎯 Found Phone ID: ${pId} in Convo: ${convId}`);

    // 2. Update Conversation Metadata
    const { error } = await supabase
        .from('conversations')
        .update({ metadata: { phoneNumberId: pId } })
        .eq('id', convId);

    if (error) {
        console.error("❌ Failed to update conversation:", error);
    } else {
        console.log("✅ Conversation metadata patched successfully!");
    }
}
run();
