
import { supabaseAdmin } from './src/lib/supabase-admin';

async function main() {
    const orgId = 'db9d1288-80ab-48df-b130-a0739881c6f2';

    console.log('--- Providers ---');
    const { data: providers, error: pErr } = await supabaseAdmin.from('ai_providers').select('*');
    if (pErr) console.error(pErr);
    else console.table(providers);

    console.log('\n--- Credentials ---');
    const { data: creds, error: cErr } = await supabaseAdmin
        .from('ai_credentials')
        .select('*')
        .eq('organization_id', orgId);

    if (cErr) console.error(cErr);
    else {
        console.table(creds.map(c => ({
            id: c.id,
            provider: c.provider_id,
            status: c.status,
            priority: c.priority,
            key_preview: c.api_key_encrypted.substring(0, 10) + '...'
        })));
    }
}

main();
