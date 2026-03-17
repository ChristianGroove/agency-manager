import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL missing");
    process.exit(1);
}

// Fallback to anon key if service role is missing for read-only diagnosis
const key = supabaseServiceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, key!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("--- DIAGNÓSTICO ESTRUCTURAL V2 ---");
    console.log(`URL: ${supabaseUrl}`);
    console.log(`Usando Key: ${supabaseServiceRoleKey ? "SERVICE_ROLE" : "ANON"}`);

    // 1. Check if the specific PlanID exists
    const targetId = '0ab2c8a7-a2d9-4ef1-8b9f-415a5c3912d7';
    const { data: targetProduct, error: tError } = await supabase
        .from('saas_products')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

    if (tError) console.error("Error al buscar el producto target:", tError.message);
    console.log(`\n¿Existe el producto ${targetId}?`, targetProduct ? "SÍ" : "NO");
    if (targetProduct) console.log("Detalles:", JSON.stringify(targetProduct, null, 2));

    // 2. List all products
    const { data: allProducts } = await supabase.from('saas_products').select('id, name, slug, status');
    console.log("\nLista de productos disponibles:");
    allProducts?.forEach(p => console.log(` - [${p.id}] ${p.name} (${p.slug}) [${p.status}]`));

    // 3. Inspect Foreign Key constraints (via RPC or Direct if possible, but let's stick to safe queries)
    // Let's try to see if saas_subscriptions has any record for a random test org
    const { data: sampleSub } = await supabase.from('saas_subscriptions').select('*').limit(1);
    console.log("\nMuestra de saas_subscriptions:", JSON.stringify(sampleSub, null, 2));

    process.exit(0);
}

run();
