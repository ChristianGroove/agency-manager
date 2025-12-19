
const { createClient } = require('@supabase/supabase-js');
// Env vars loaded via --env-file flag

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedOneOff() {
    // 1. Get the test client (Christian Groove)
    const { data: client } = await supabase
        .from('clients')
        .select('id, portal_short_token')
        .eq('name', 'christian groove')
        .single();

    if (!client) {
        console.error('Client not found');
        return;
    }

    // 2. Create One-off Service
    const serviceName = 'Diseño de Logo (One-off)';

    // Check if exists first
    const { data: existing } = await supabase.from('services').select('id').eq('name', serviceName).single();
    let serviceId = existing?.id;

    if (!existing) {
        const { data: created, error } = await supabase.from('services').insert({
            client_id: client.id,
            name: serviceName,
            description: 'Servicio puntual que debe desaparecer al pagar.',
            status: 'active',
            type: 'one_off',
            start_date: new Date().toISOString()
        }).select().single();

        if (error) {
            console.error('Error creating service:', error);
            return;
        }
        serviceId = created.id;
        console.log('Created One-off Service:', serviceName);
    } else {
        console.log('Using existing service:', serviceName);
    }

    // 3. Create Pending Invoice linked to it
    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
        client_id: client.id,
        service_id: serviceId,
        number: 'INV-TEST-ONE-OFF',
        date: new Date().toISOString(),
        total: 500000,
        status: 'pending',
        items: [{ description: 'Logo Design', quantity: 1, price: 500000 }]
    }).select().single();

    if (invError) console.error('Error creating invoice:', invError);
    else console.log('Created PENDING invoice for service:', invoice.number);

    console.log('Setup complete. Check portal. Service should be VISIBLE.');
}

seedOneOff();
