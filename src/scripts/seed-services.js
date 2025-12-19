
const { createClient } = require('@supabase/supabase-js');
// Env vars loaded via --env-file flag

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedServices() {
    // 1. Get the test client (Christian Groove)
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, portal_short_token')
        .eq('name', 'christian groove')
        .single();

    if (!clients) {
        console.error('Client not found');
        return;
    }

    const clientId = clients.id;
    console.log(`Seeding services for: ${clients.name} (${clients.portal_short_token})`);

    // 2. Services Data
    const servicesData = [
        {
            client_id: clientId,
            name: 'Consultoría Estratégica',
            description: 'Asesoría mensual y planificación de crecimiento.',
            status: 'active',
            start_date: new Date().toISOString()
        },
        {
            client_id: clientId,
            name: 'Mantenimiento Web',
            description: 'Soporte técnico, backups y actualizaciones.',
            status: 'active',
            start_date: new Date().toISOString()
        }
    ];

    // Manual Upsert Logic
    for (const service of servicesData) {
        // Check existence
        const { data: existing } = await supabase
            .from('services')
            .select('id')
            .eq('client_id', clientId)
            .eq('name', service.name)
            .single();

        let serviceId;
        if (!existing) {
            const { data: created, error } = await supabase.from('services').insert(service).select().single();
            if (error) console.error('Error creating service:', error);
            else {
                console.log(`Created service: ${created.name}`);
                serviceId = created.id;
            }
        } else {
            console.log(`Service already exists: ${service.name}`);
            serviceId = existing.id;
        }

        // Link invoices if we have a serviceId
        if (serviceId) {
            const { data: unlinkedInvoices } = await supabase
                .from('invoices')
                .select('id')
                .eq('client_id', clientId)
                .is('service_id', null)
                .limit(1);

            if (unlinkedInvoices && unlinkedInvoices.length > 0) {
                await supabase
                    .from('invoices')
                    .update({ service_id: serviceId })
                    .eq('id', unlinkedInvoices[0].id);
                console.log(`Linked invoice to ${service.name}`);
            }
        }
    }

    console.log('Seeding complete. Refresh the portal.');
}

seedServices();
