import { supabaseAdmin } from "./src/lib/supabase-admin";

async function diagnose() {
    console.log("--- DIAGNÓSTICO DE FACTURACIÓN ---");
    
    // 1. Check Products
    const { data: products, error: pError } = await supabaseAdmin.from('saas_products').select('id, name, slug');
    console.log("Productos en saas_products:", products?.length || 0);
    if (products) products.forEach(p => console.log(` - [${p.id}] ${p.name} (${p.slug})`));
    if (pError) console.error("Error al leer saas_products:", pError.message);

    // 2. Check Organizations
    const { data: orgs, error: oError } = await supabaseAdmin.from('organizations').select('id, name, subscription_product_id');
    console.log("\nOrganizaciones:", orgs?.length || 0);
    if (orgs) orgs.forEach(o => {
        const isValid = products?.some(p => p.id === o.subscription_product_id);
        console.log(` - [${o.id}] ${o.name} -> Plan: ${o.subscription_product_id} (${isValid ? "VÁLIDO" : "INVÁLIDO/HUÉRFANO"})`);
    });
    if (oError) console.error("Error al leer organizations:", oError.message);

    // 3. Check Subscriptions
    const { data: subs, error: sError } = await supabaseAdmin.from('saas_subscriptions').select('organization_id, plan_id, status');
    console.log("\nSuscripciones activas:", subs?.length || 0);
    if (sError) console.error("Error al leer saas_subscriptions:", sError.message);

    process.exit(0);
}

diagnose();
