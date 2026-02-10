
import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    console.log('Searching for "Dannicel"...');
    const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', '%dannicel%');

    if (error || !orgs || orgs.length === 0) {
        console.error('Organization not found!', error);
        return;
    }

    const org = orgs[0]; // Take the first match
    console.log(`Found: ${org.name} (${org.slug})`);
    console.log('Current Overrides:', org.manual_module_overrides);

    let overrides = org.manual_module_overrides || [];
    if (!overrides.includes('module_manifests')) {
        overrides.push('module_manifests');

        const { error: updateError } = await supabase
            .from('organizations')
            .update({ manual_module_overrides: overrides })
            .eq('id', org.id);

        if (updateError) {
            console.error('Failed to update:', updateError);
        } else {
            console.log('SUCCESS: "module_manifests" activated for', org.slug);
        }
    } else {
        console.log('Module already active.');
    }
}

main();
