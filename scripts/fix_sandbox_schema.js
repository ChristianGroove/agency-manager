const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fix() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        console.log('--- REPARANDO RELACIONES (SANDBOX) ---');

        // 1. Add foreign key for organizations
        console.log('Adding organization_id FK...');
        await client.query(`
            ALTER TABLE public.organization_members 
            ADD CONSTRAINT organization_members_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        `);

        // 2. Add foreign key for users (auth.users)
        console.log('Adding user_id FK...');
        await client.query(`
            ALTER TABLE public.organization_members 
            ADD CONSTRAINT organization_members_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        `);

        // 3. Profiles to Auth Users
        console.log('Checking profiles FK...');
        try {
            await client.query(`
                ALTER TABLE public.profiles 
                ADD CONSTRAINT profiles_id_fkey 
                FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
            `);
        } catch (e) {
            console.log('Profiles FK already exists or error: ' + e.message);
        }

        // 4. Force Reload PostgREST cache
        console.log('Reloading PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log('✅ REPARACIÓN COMPLETADA.');

    } catch (err) {
        console.error('❌ Error en reparación:', err.message);
    } finally {
        await client.end();
    }
}

fix();
