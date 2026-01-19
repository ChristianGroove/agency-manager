
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('conversations').select('*').limit(1);
    if (error) {
        console.error(error);
        return;
    }
    console.log("--- 🗨️ CONVERSATION SAMPLE ---");
    console.log(JSON.stringify(data[0], null, 2));
}
run();
