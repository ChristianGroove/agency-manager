import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("--- INSPECCIÓN DE SAAS_APPS ---");

    const { data: apps, error } = await supabase.from('saas_apps').select('id, name');
    if (error) {
        console.error("Error al leer saas_apps:", error.message);
    } else {
        console.log("Apps disponibles en saas_apps:");
        apps?.forEach(a => console.log(` - [${a.id}] ${a.name}`));
    }

    // Check organization active_app_id
    const { data: orgs } = await supabase.from('organizations').select('name, active_app_id').limit(5);
    console.log("\nMuestra de active_app_id en organizaciones:");
    orgs?.forEach(o => console.log(` - ${o.name}: ${o.active_app_id}`));

    process.exit(0);
}

run();
