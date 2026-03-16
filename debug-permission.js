
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermission() {
    // 1. Find lead by name
    const { data: leads, error: leadErr } = await supabase
        .from('leads')
        .select('id, name, phone')
        .ilike('name', '%Christian Groove%');

    if (leadErr) {
        console.error('Lead error:', leadErr);
        return;
    }

    if (!leads || leads.length === 0) {
        console.log('No leads found with name Christian Groove');
        // Try by phone partial
        const { data: leadsByPhone } = await supabase
            .from('leads')
            .select('id, name, phone')
            .ilike('phone', '%573006705958%');
        
        if (!leadsByPhone || leadsByPhone.length === 0) {
            console.log('No leads found by phone either');
            return;
        }
        leads.push(...leadsByPhone);
    }

    const lead = leads[0];
    console.log('Lead found:', lead);

    // 2. Find conversations (All states to be sure)
    const { data: convs } = await supabase
        .from('conversations')
        .select('id, metadata, state, channel')
        .eq('lead_id', lead.id);

    if (!convs || convs.length === 0) {
        console.log('Conversations not found for lead:', lead.id);
        return;
    }

    console.log('Conversations found:', convs.length);
    convs.forEach(c => {
        console.log(`- ID: ${c.id}, Channel: ${c.channel}, State: ${c.state}`);
        console.log('  Metadata:', JSON.stringify(c.metadata, null, 2));
    });

    // 3. Find latest messages for the most recent conversation
    const activeConv = convs.find(c => c.state === 'active') || convs[0];
    const { data: msgs } = await supabase
        .from('messages')
        .select('direction, content, external_id, created_at')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('Latest messages for:', activeConv.id);
    console.log(JSON.stringify(msgs, null, 2));
}

checkPermission();
