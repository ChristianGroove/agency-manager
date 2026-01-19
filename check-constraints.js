
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraints() {
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'conversations' });

    if (error) {
        console.log('Error fetching via RPC, trying direct query...');
        const { data: raw, error: rawError } = await supabase.from('_sql').select('*').limit(1); // This won't work usually
        // Let's just try to insert a fake one and see the error
        const { error: insError } = await supabase.from('conversations').insert({
            organization_id: '00000000-0000-0000-0000-000000000000',
            lead_id: '00000000-0000-0000-0000-000000000000',
            channel: 'messenger',
            phone: 'test',
            state: 'active',
            status: 'open'
        });
        console.log('Test Insert Result (messenger):', insError?.message || 'Success');

        const { error: insError2 } = await supabase.from('messages').insert({
            conversation_id: '00000000-0000-0000-0000-000000000000',
            direction: 'inbound',
            channel: 'messenger',
            content: 'test',
            status: 'received'
        });
        console.log('Test Insert Result Message (messenger):', insError2?.message || 'Success');
    } else {
        console.log('Constraints:', JSON.stringify(data, null, 2));
    }
}

checkConstraints();
