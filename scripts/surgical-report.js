const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CODE_MODULES = [
    { key: 'module_manifests', name: 'Manifiestos IMEI' },
    { key: 'module_contracts', name: 'Gestión de Contratos' },
    { key: 'module_quotes', name: 'Cotizaciones' },
    { key: 'module_messaging', name: 'Messaging Console' },
    { key: 'tool_email_engine', name: 'Motor de Correos' }
];

async function check() {
    const { data: dbModules } = await supabase.from('system_modules').select('key, name');
    const dbKeys = (dbModules || []).map(m => m.key);

    console.log('--- Módulos Faltantes en Base de Datos ---');
    CODE_MODULES.forEach(cm => {
        if (!dbKeys.includes(cm.key)) {
            console.log(`[!] FALTANTE: ${cm.name} (${cm.key})`);
        } else {
            console.log(`[ok] Presente: ${cm.name}`);
        }
    });

    console.log('\n--- Módulos no categorizados o sospechosos ---');
    const { data: saasAppModules } = await supabase.from('saas_app_modules').select('module_key');
    const usedKeys = new Set(saasAppModules.map(m => m.module_key));

    dbKeys.forEach(k => {
        if (!usedKeys.has(k)) {
            console.log(`[-] Módulo sin asignar a ningún Space: ${k}`);
        }
    });
}

check();
