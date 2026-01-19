
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkChannel() {
    console.log('Testing "messenger" channel insertion...');

    const uniquePhone = 'test_messenger_' + Date.now();

    // 1. Create a dummy lead first (required for FK)
    const { data: lead, error: leadError } = await supabase.from('leads').insert({
        organization_id: 'db9d1288-80ab-48df-b130-a0739881c6f2', // Use known valid org
        phone: uniquePhone,
        name: 'Test Constraint',
        status: 'new'
    }).select().single();

    if (leadError) {
        console.error('Lead Insert Error:', leadError);
        return;
    }
    console.log('Lead created:', lead.id);

    // 2. Try to create conversation with 'messenger'
    const { data: conv, error: convError } = await supabase.from('conversations').insert({
        organization_id: 'db9d1288-80ab-48df-b130-a0739881c6f2',
        lead_id: lead.id,
        channel: 'messenger',
        phone: uniquePhone,
        state: 'active',
        status: 'open',
        unread_count: 0,
        last_message_at: new Date().toISOString()
    }).select();

    if (convError) {
        console.error('Conversation Insert Error (messenger):', convError);
    } else {
        console.log('Success! Conversation created with channel: messenger');
        // Cleanup
        await supabase.from('conversations').delete().eq('id', conv[0].id);
    }

    // Cleanup lead
    await supabase.from('leads').delete().eq('id', lead.id);
}

checkChannel();
