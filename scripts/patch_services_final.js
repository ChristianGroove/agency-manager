const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function patchServices() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();

        console.log('--- PATCHING SERVICES TABLE ---');

        // 0. Ensure 'emitters' exists (referenced by emitter_id)
        // Actually, migration 20251226_add_emitter_id_corrected.sql refs 'emitters' or 'billing_profiles'.
        // Let's assume emitters for now or make it a soft dependency?
        // Better to check if emitters exists.
        const resEmitters = await client.query("SELECT to_regclass('public.emitters')");
        const hasEmitters = resEmitters.rows[0].to_regclass !== null;

        // 1. Get existing columns
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'services'");
        const cols = res.rows.map(r => r.column_name);

        const required = ['emitter_id', 'document_type', 'quantity', 'deleted_at', 'metadata'];
        const missing = required.filter(r => !cols.includes(r));

        console.log('Missing columns:', missing);

        for (const m of missing) {
            let type = 'TEXT';
            let constraint = '';

            if (m === 'emitter_id') {
                type = 'UUID';
                if (hasEmitters) {
                    // constraint = 'REFERENCES public.emitters(id) ON DELETE SET NULL';
                    // For safety in sandbox, maybe skip FK constraint if table issues exist?
                    // Let's try to add FK if possible.
                    constraint = 'REFERENCES public.emitters(id)';
                }
            }
            if (m === 'quantity') type = 'INTEGER DEFAULT 1';
            if (m === 'deleted_at') type = 'TIMESTAMP WITH TIME ZONE';
            if (m === 'metadata') type = 'JSONB DEFAULT \'{}\'::jsonb';

            console.log(`Adding ${m}...`);
            try {
                // Determine if we can safe add constraint
                if (constraint) {
                    await client.query(`ALTER TABLE public.services ADD COLUMN IF NOT EXISTS ${m} ${type} ${constraint}`);
                } else {
                    await client.query(`ALTER TABLE public.services ADD COLUMN IF NOT EXISTS ${m} ${type}`);
                }
            } catch (err) {
                console.log(`Warning adding ${m}: ${err.message}. Trying without constraint...`);
                if (constraint) {
                    await client.query(`ALTER TABLE public.services ADD COLUMN IF NOT EXISTS ${m} ${type}`);
                }
            }
        }

        // Reload Schema
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log('✅ SERVICES PATCHED.');

    } catch (err) {
        console.error('❌ Error during services patch:', err.message);
    } finally {
        await client.end();
    }
}

patchServices();
