
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
import { createClient } from "@/modules/core/database/supabase-server";

async function checkTables() {
    console.log('Checking vertical_modules...');
    const { data: vm, error: vmError } = await (await createClient()).from('vertical_modules').select('*').limit(1);
    if (vmError) console.log('vertical_modules Error:', vmError.message);
    else console.log('vertical_modules exists, count:', vm?.length);

    console.log('Checking saas_app_modules...');
    const { data: sam, error: samError } = await (await createClient()).from('saas_app_modules').select('*').limit(1);
    if (samError) console.log('saas_app_modules Error:', samError.message);
    else console.log('saas_app_modules exists, rows:', sam?.length);
}

checkTables();
