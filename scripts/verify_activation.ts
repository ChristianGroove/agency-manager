
import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) { console.error('No credentials'); process.exit(1); }

const supabase = createClient(url, key);

async function main() {
    const { data, error } = await supabase
        .from('organizations')
        .select('slug, name, manual_module_overrides')
        .ilike('name', '%dannicel%');

    if (error) {
        console.error(error);
    } else {
        console.log('--- VERIFICATION ---');
        console.log(JSON.stringify(data, null, 2));
    }
}

main();
