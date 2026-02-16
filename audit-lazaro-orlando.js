const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLazaroOrlando() {
    console.log('--- AUDIT: Lazaro & Orlando ---');

    // 1. Check Lazaro
    const { data: lazaro } = await supabase.from('clients').select('id, name').ilike('name', '%Lazaro%').single();
    if (lazaro) {
        console.log(`\nClient: ${lazaro.name}`);
        // Get Services
        const { data: services } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', lazaro.id)
            .eq('status', 'active');

        console.log(`  Active Services: ${services.length}`);
        services.forEach(s => {
            console.log(`  - ${s.name} | Freq: ${s.frequency} | Next: ${s.next_billing_date} | Amt: ${s.amount}`);
        });

        // Get Invoices Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: invs } = await supabase
            .from('invoices')
            .select('id, number, total, created_at, items')
            .eq('client_id', lazaro.id)
            .gte('created_at', today.toISOString());

        console.log(`  Invoices Today: ${invs.length}`);
        invs.forEach(i => console.log(`    ${i.number} | ${i.items[0].description} | $${i.total}`));
    }

    // 2. Check Orlando
    const { data: orlando } = await supabase.from('clients').select('id, name').ilike('name', '%Orlando Melo%').single();
    if (orlando) {
        console.log(`\nClient: ${orlando.name}`);
        const { data: services } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', orlando.id)
            .eq('status', 'active');

        console.log(`  Active Services: ${services.length}`);
        services.forEach(s => {
            console.log(`  - ${s.name} | Freq: ${s.frequency} | Next: ${s.next_billing_date}`);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: invs } = await supabase
            .from('invoices')
            .select('id, number, total, created_at, items, due_date')
            .eq('client_id', orlando.id)
            .gte('created_at', today.toISOString());

        console.log(`  Invoices Today: ${invs.length}`);
        invs.forEach(i => console.log(`    ${i.number} | ${i.items[0].description} | Due: ${i.due_date}`));
    }
}

auditLazaroOrlando();
