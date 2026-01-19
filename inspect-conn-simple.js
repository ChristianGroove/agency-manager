
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: conn } = await supabase.from('integration_connections').select('id, metadata').eq('provider_key', 'meta_business').limit(1).single();
    if (!conn) { console.log("Not found"); return; }
    console.log("METADATA_START");
    console.log(JSON.stringify(conn.metadata, null, 2));
    console.log("METADATA_END");
}
run();
