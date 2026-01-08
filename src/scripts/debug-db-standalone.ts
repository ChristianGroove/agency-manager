
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('--- Checking DB Connection and Schema ---');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('URL:', url ? 'Matches' : 'MISSING');
    console.log('KEY:', key ? 'Matches' : 'MISSING');

    if (!url || !key) {
        console.error('Missing credentials. Aborting.');
        return;
    }

    const supabase = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Check ai_credentials table
    console.log('Querying ai_credentials...');
    const { data: creds, error: credError } = await supabase
        .from('ai_credentials')
        .select('*')
        .limit(1);

    if (credError) {
        console.error('FAILED to query ai_credentials:', JSON.stringify(credError, null, 2));
    } else {
        console.log('SUCCESS querying ai_credentials. Count:', creds?.length);
    }

    // Check ai_providers table
    console.log('Querying ai_providers...');
    const { data: provs, error: provError } = await supabase
        .from('ai_providers')
        .select('*')
        .limit(1);

    if (provError) {
        console.error('FAILED to query ai_providers:', JSON.stringify(provError, null, 2));
    } else {
        console.log('SUCCESS querying ai_providers. Count:', provs?.length);
    }
}

main().catch(console.error);
