const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const modulesToInsert = [
    {
        key: 'module_manifests',
        name: 'Manifiestos IMEI',
        description: 'Gestión y archivo automático de documentos de manifiestos y lotes de IMEI.',
        category: 'tools',
        price_monthly: 19.99,
        is_active: true
    },
    {
        key: 'tool_email_engine',
        name: 'Motor de Correos',
        description: 'Herramienta centralizada para el envío y monitoreo de campañas de correo transaccional.',
        category: 'tools',
        price_monthly: 9.99,
        is_active: true
    },
    {
        key: 'module_contract_generator',
        name: 'Generador de Contratos',
        description: 'Copiloto de IA para generación, vista previa y almacenamiento de contratos legales.',
        category: 'tools',
        price_monthly: 29.99,
        is_active: true
    }
];

async function run() {
    for (const mod of modulesToInsert) {
        const { error } = await supabase.from('system_modules').upsert(mod, { onConflict: 'key' });
        if (error) {
            console.error(`Error inserting ${mod.key}:`, error);
        } else {
            console.log(`Inserted/Updated: ${mod.key}`);
        }
    }
}

run();
