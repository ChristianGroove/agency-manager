
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deepDebug() {
    const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .ilike('name', '%carnaval del pollo%')
        .single();

    if (!org) return console.log('Org not found');

    const { data: connections } = await supabase
        .from('integration_connections')
        .select('provider_key, metadata, credentials')
        .eq('organization_id', org.id)
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud']);

    console.log('Connections found:', connections.length);
    connections.forEach(c => {
        console.log('Key:', c.provider_key);
        console.log('Metadata:', JSON.stringify(c.metadata, null, 2));
    });
}

deepDebug();
