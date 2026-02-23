
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars: URL or KEY');
    console.log('URL:', supabaseUrl);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugConnection() {
    console.log('--- Debugging WhatsApp Connection (integration_connections) ---');

    // 1. Find Org by Name
    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .ilike('name', '%carnaval del pollo%');

    if (orgError) {
        console.error('Error finding org:', orgError);
        return;
    }

    if (!orgs || orgs.length === 0) {
        console.log('No organization found with name matching "carnaval del pollo"');
    } else {
        console.log('Found Organizations:', orgs);
    }

    // 2. Check connections for each matching org
    for (const org of orgs) {
        console.log(`\nChecking integration_connections for Org: ${org.name} (${org.id})`);

        // Check for 'meta_whatsapp' specifically
        const { data: connections, error: connError } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('organization_id', org.id);

        if (connError) {
            console.error('Error checking connections:', connError);
        } else {
            console.log('Total Connections found:', connections.length);

            const waConn = connections.find(c => c.provider_key === 'meta_whatsapp');
            const evoConn = connections.find(c => c.provider_key === 'evolution_api');

            if (waConn) {
                console.log('✅ Meta WhatsApp Connection Found:', {
                    id: waConn.id,
                    provider_key: waConn.provider_key,
                    connection_name: waConn.connection_name,
                    status: waConn.status,
                    created_at: waConn.created_at,
                    credentials: waConn.credentials ? '[REDACTED]' : null
                });
            } else {
                console.log('❌ No "meta_whatsapp" connection found.');
            }

            if (evoConn) {
                console.log('ℹ️ Evolution API Connection Found:', {
                    id: evoConn.id,
                    status: evoConn.status
                });
            }

            // Dump all provider keys to see what IS there
            console.log('Available Provider Keys:', connections.map(c => c.provider_key));
        }
    }
}

debugConnection();
