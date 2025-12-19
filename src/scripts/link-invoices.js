const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function linkInvoices() {
    console.log('Linking invoices...');
    const { data: services } = await supabase.from('services').select('id, client_id, name');

    if (!services || services.length === 0) {
        console.log('No services found.');
        return;
    }

    for (const service of services) {
        // Find unlinked invoices for this client where description matches
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('id, items')
            .eq('client_id', service.client_id)
            .is('service_id', null);

        if (invoices && invoices.length > 0) {
            for (const inv of invoices) {
                // Check match
                const itemsString = JSON.stringify(inv.items).toLowerCase();
                const serviceName = service.name.toLowerCase();

                // Simple inclusion check
                if (itemsString.includes(serviceName)) {
                    await supabase.from('invoices')
                        .update({ service_id: service.id })
                        .eq('id', inv.id);
                    console.log(`Linked invoice ${inv.id} to service: ${service.name}`);
                }
            }
        }
    }
    console.log('Invoice linking complete.');
}

linkInvoices();
