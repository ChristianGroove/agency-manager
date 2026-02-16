const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function rollbackLazaroOrlando() {
    console.log('--- Rollback Lazaro & Orlando ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // 1. LAZARO (One-Time Services)
    const { data: lazaro } = await supabase.from('clients').select('id, name').ilike('name', '%Lazaro%').single();
    if (lazaro) {
        console.log(`\nProcessing Lazaro (${lazaro.id})...`);

        // Find invoices generated today for "One-Time" services
        // Identification: Service frequency is null OR name contains "Sprint" / "Hora"
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, number, total, created_at, billing_cycle_id, items')
            .eq('client_id', lazaro.id)
            .gte('created_at', today.toISOString());

        for (const inv of invoices) {
            const desc = inv.items[0]?.description || '';
            console.log(`Checking Invoice ${inv.number} (${desc})...`);

            // Heuristic Check
            if (desc.includes('Hora') || desc.includes('Sprint') || desc.includes('Design')) {
                console.log('  -> DELETING One-Time Invoice.');
                if (inv.billing_cycle_id) await supabase.from('billing_cycles').delete().eq('id', inv.billing_cycle_id);
                await supabase.from('invoices').delete().eq('id', inv.id);
            }
        }

        // DEACTIVATE One-Time Services
        const { data: services } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', lazaro.id)
            .or('frequency.is.null,frequency.eq.one_time'); // Check explicit one-time or null

        // Also check by name if frequency is mistakenly 'monthly'
        const { data: namedServices } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', lazaro.id)
            .ilike('name', '%Hora%'); // "Por Hora"

        const allTargets = [...(services || []), ...(namedServices || [])];
        const uniqueTargets = [...new Map(allTargets.map(item => [item['id'], item])).values()];

        for (const s of uniqueTargets) {
            console.log(`  -> DEACTIVATING Service: ${s.name}`);
            await supabase.from('services').update({ status: 'completed', next_billing_date: null }).eq('id', s.id);
        }
    }

    // 2. ORLANDO (Premier Quarterly)
    const { data: orlando } = await supabase.from('clients').select('id, name').ilike('name', '%Orlando Melo%').single();
    if (orlando) {
        console.log(`\nProcessing Orlando (${orlando.id})...`);

        // Delete ALL invoices generated TODAY (User said they are wrong/premature)
        // We will likely want to keep valid ones? 
        // User said "facturas de febrero que aun no es la fecha".
        // Safer to delete ALL generated today and reset him to Feb 28.

        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, number, total, billing_cycle_id')
            .eq('client_id', orlando.id)
            .gte('created_at', today.toISOString());

        for (const inv of invoices) {
            console.log(`  -> DELETING Premature Invoice: ${inv.number}`);
            if (inv.billing_cycle_id) await supabase.from('billing_cycles').delete().eq('id', inv.billing_cycle_id);
            await supabase.from('invoices').delete().eq('id', inv.id);
        }

        // RESET DATE to Feb 28 (or correct quarterly date)
        // Find the quarterly service
        const { data: service } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', orlando.id)
            .ilike('name', '%Diseño%') // "Departamento de Diseño Estándar"
            .single();

        if (service) {
            // Hard reset to Feb 28, 2026 (User said "28/2/2026")
            const resetDate = '2026-02-28T05:00:00.000Z';
            console.log(`  -> RESETTING Service Date to: ${resetDate}`);
            await supabase.from('services').update({ next_billing_date: resetDate }).eq('id', service.id);

            // Sync Sub
            await supabase.from('subscriptions')
                .update({ next_billing_date: resetDate })
                .eq('client_id', orlando.id)
                .ilike('name', service.name);
        }
    }
}

rollbackLazaroOrlando();
