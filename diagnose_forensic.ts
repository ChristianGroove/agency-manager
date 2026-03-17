import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("--- DIAGNÓSTICO FORENSE DE ESQUEMA ---");

    // 1. Get Table Definition and Constraints via SQL
    // We try to query information_schema or use a clever trick if RPC is not available
    // Actually, let's try to just select a product and see if we can find 'agencia-os' again
    
    console.log("\n1. Verificando productos disponibles:");
    const { data: products } = await supabase.from('saas_products').select('id, slug, name');
    console.log(JSON.stringify(products, null, 2));

    console.log("\n2. Verificando suscripciones actuales:");
    const { data: subs } = await supabase.from('saas_subscriptions').select('id, plan_id').limit(5);
    console.log(JSON.stringify(subs, null, 2));

    // 3. Attempting to get the constraint definition 
    // Since we cannot run raw SQL easily via JS without an RPC, we will try to 'force' a valid insert
    // with different IDs to see which one works.
    
    process.exit(0);
}

run();
