
const { createClient } = require('@supabase/supabase-js');
// Env vars loaded via --env-file flag

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getTestToken() {
    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, portal_short_token, name')
        .limit(1);

    if (error) {
        console.error('Error fetching clients:', error);
        return;
    }

    if (clients && clients.length > 0) {
        const client = clients[0];
        console.log(`Found client: ${client.name}`);
        console.log(`Token: ${client.portal_short_token}`);
        console.log(`Client ID: ${client.id}`);

        // Check for services
        const { data: services } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', client.id);

        if (services && services.length === 0) {
            console.log('No services found. Creating test service...');
            const { error: insertError } = await supabase.from('services').insert({
                client_id: client.id,
                name: 'Desarrollo Web & Branding',
                description: 'Servicio integral de diseño y desarrollo.',
                status: 'active',
                start_date: new Date().toISOString()
            });

            if (insertError) console.error('Error creating service:', insertError);
            else console.log('Test service created!');
        } else {
            console.log(`Found ${services.length} services.`);
        }
    } else {
        console.log('No clients found');
    }
}

getTestToken();
