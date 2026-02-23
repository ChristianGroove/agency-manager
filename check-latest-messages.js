
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLatestMessages() {
    console.log('--- Checking Latest Inbox Messages ---');

    const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%');

    if (!orgs || orgs.length === 0) return console.log('❌ No orgs found');
    const org = orgs[0];
    console.log(`Org: ${org.name} (${org.id})`);

    const { data: messages } = await supabase
        .from('inbox_messages')
        .select('id, created_at, content, sender_id, conversation_id')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (!messages || messages.length === 0) {
        console.log('No messages found for this org.');
    } else {
        console.log(`Found ${messages.length} messages:`);
        messages.forEach(msg => {
            console.log(`[${msg.created_at}] ID: ${msg.id} | Content: ${msg.content}`);
        });
    }
}

checkLatestMessages();
