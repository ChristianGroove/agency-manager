
import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

// Load .env.local correctly using Next.js utility
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing Supabase credentials!');
    console.log('URL:', url);
    console.log('KEY:', key ? 'FOUND' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    console.log('Connecting to Supabase...');

    const { data, error } = await supabase
        .from('organizations')
        .select('slug, name, manual_module_overrides')
        .ilike('name', '%dannicel%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('--- DANNICEL SEARCH RESULTS ---');
        console.log(JSON.stringify(data, null, 2));
    }
}

main();
