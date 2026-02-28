const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    let out = "";
    const { data: spaces } = await supabase.from('saas_apps').select('id, name');
    const agencySpace = spaces?.find(s => s.name.includes('Agency') || s.id === 'app_marketing_starter');

    if (agencySpace) {
        out += `\n=== Agency Space Modules (${agencySpace.name}) ===\n`;
        const { data: appModules } = await supabase.from('saas_app_modules').select('module_key, is_optional, auto_enable').eq('app_id', agencySpace.id);
        out += JSON.stringify(appModules, null, 2) + "\n";
    }

    const { data: modules } = await supabase.from('system_modules').select('key, name, category, is_active');
    out += `\n=== System Modules Catalog ===\n`;
    out += JSON.stringify(modules, null, 2) + "\n";

    const { data: tenant } = await supabase.from('organizations').select('id, name, active_app_id, manual_module_overrides').not('name', 'ilike', '%pixy%').limit(1).single();
    if (tenant) {
        out += `\n=== Tenant Modules (${tenant.name}) ===\n`;
        out += JSON.stringify(tenant, null, 2) + "\n";
    }

    fs.writeFileSync('scripts/test-modules-pure.txt', out);
    console.log("Done");
}

run();
