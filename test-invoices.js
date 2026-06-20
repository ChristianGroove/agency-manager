const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data, error } = await supabase.from('saas_platform_invoices')
        .select('*, organization:organizations(name), payment_transaction:payment_transactions(*)')
        .order('created_at', { ascending: false })
        .range(0, 50);
    console.log("Error:", error);
    console.log(data);
}
run();
