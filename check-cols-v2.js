
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('conversations').select('*').limit(1);
    if (!data || data.length === 0) {
        console.log("No conversations found");
        return;
    }
    console.log("COLUMNS:");
    Object.keys(data[0]).forEach(k => console.log(`- ${k}`));
}
run();
