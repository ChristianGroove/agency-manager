const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Robust SQL to get triggers and their functions
    const sql = `
        SELECT 
            tgname as trigger_name,
            relname as table_name,
            proname as function_name,
            CASE tgtype::integer & 66
                WHEN 2 THEN 'BEFORE'
                WHEN 64 THEN 'INSTEAD OF'
                ELSE 'AFTER'
            END as timing,
            CASE tgtype::integer & 28
                WHEN 4 THEN 'INSERT'
                WHEN 8 THEN 'DELETE'
                WHEN 16 THEN 'UPDATE'
                WHEN 20 THEN 'INSERT/UPDATE'
                WHEN 28 THEN 'INSERT/UPDATE/DELETE'
                ELSE 'OTHER'
            END as event
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_proc ON pg_trigger.tgfunction = pg_proc.oid
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        WHERE nspname = 'public'
        AND relname IN ('crm_lead_tags', 'conversations', 'leads')
        AND tgisinternal = false;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error fetching triggers:', error);
    } else {
        console.log('--- ALL TRIGGERS ---');
        console.table(data);
    }
}

check();
