
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '.env.local') });
import { supabaseAdmin } from './src/lib/supabase-admin';

async function checkApps() {
    console.log("Checking saas_apps table...");
    const { data, error } = await supabaseAdmin
        .from('saas_apps')
        .select('id, name, slug')
        .eq('is_active', true);

    if (error) {
        console.error("Error fetching saas_apps:", error);
    } else {
        console.log("Found apps:", data);
    }
}

checkApps();
