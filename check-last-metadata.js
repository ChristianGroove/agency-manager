
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('conversations')
        .select('id, metadata, connection_id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error(error);
        return;
    }
    console.log("--- 💡 LATEST CONVO METADATA ---");
    console.log(JSON.stringify(data, null, 2));
}
run();
