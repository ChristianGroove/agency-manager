
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deepDebug() {
    console.log('--- Deep Debug WhatsApp Connection ---');

    // 1. Get the specific Org
    const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%carnaval del pollo%')
        .single();

    if (!org) {
        console.error('Org not found');
        return;
    }
    console.log(`Target Org: ${org.name} (${org.id})`);

    // 2. Fetch connections exactly as the code does (but with admin privileges here)
    const providerKeys = ['meta_whatsapp', 'whatsapp_cloud'];

    const { data: connections, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', org.id)
        .in('provider_key', providerKeys)
        .eq('status', 'active');

    if (error) {
        console.error('DB Error:', error);
    } else {
        console.log(`Found ${connections.length} matching connections.`);
        connections.forEach(c => {
            console.log(`- Connection ID: ${c.id}`);
            console.log(`  Provider Key: ${c.provider_key}`);
            console.log(`  Status: ${c.status}`);
            console.log(`  Credentials Type: ${typeof c.credentials}`);
            try {
                let creds = typeof c.credentials === 'string' ? JSON.parse(c.credentials) : c.credentials;
                console.log('  Keys available:', Object.keys(creds));
                console.log('  Phone ID:', creds.phone_number_id || creds.phoneNumberId);
                console.log('  Metadata:', c.metadata);
                console.log('  WABA ID:', creds.waba_id || creds.business_account_id);
            } catch (e) {
                console.error('  Credentials Error:', e.message);
            }
        });
    }

    // 3. Check Organization Settings for legacy data
    console.log('\n--- Checking Organization Settings ---');
    const { data: settings } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', org.id)
        .single();

    if (settings) {
        // Log keys that look like phone ids
        const keys = Object.keys(settings).filter(k => k.includes('phone') || k.includes('id') || k.includes('meta'));
        console.log('Relevant Settings Keys:', keys);
        console.log('Values:', {
            whatsapp_phone_number_id: settings.whatsapp_phone_number_id,
            meta_phone_number_id: settings.meta_phone_number_id,
            phone_number_id: settings.phone_number_id
        });
    } else {
        console.log('No organization_settings found.');
    }
}

deepDebug();
