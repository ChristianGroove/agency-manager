
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMetadata() {
    console.log('Searching for "Aceptar Llamada" metadata...');
    const { data: msgs } = await supabase
        .from('messages')
        .select('id, metadata, content')
        .ilike('content->>text', '%Aceptar Llamada%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (msgs && msgs.length > 0) {
        console.log('FULL METADATA:', JSON.stringify(msgs[0].metadata, null, 2));
        console.log('FULL CONTENT:', JSON.stringify(msgs[0].content, null, 2));
    } else {
        console.log('No message found');
    }
}

checkMetadata();
