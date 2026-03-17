import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("--- INSPECCIÓN DE ESQUEMA PROFUNDA ---");

    // Check column type
    const { data: columns, error: cError } = await supabase.rpc('get_column_type', { 
        t_name: 'saas_subscriptions', 
        c_name: 'plan_id' 
    });
    
    // If RPC fails (likely because it doesn't exist), try to guess via data
    const { data: sample } = await supabase.from('saas_subscriptions').select('plan_id').limit(1).maybeSingle();
    console.log("Muestra de plan_id:", sample?.plan_id);
    console.log("Tipo probable:", typeof sample?.plan_id);

    // Get Foreign Key info via Direct SQL if possible (Supabase might restrict this, but let's try via a generic query)
    const { data: fkInfo, error: fError } = await supabase.from('saas_products').select('id, slug').limit(1);
    console.log("\nEstructura de saas_products:", JSON.stringify(fkInfo, null, 2));

    process.exit(0);
}

run();
