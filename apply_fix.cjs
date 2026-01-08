
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

async function main() {
    console.log('Connecting to DB...');
    // Try to construct connection string or find one
    // Usually Supabase provides DATABASE_URL
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL not found in .env.local');
        // Fallback: If no DATABASE_URL, maybe we can construct it? 
        // But for Supabase local, it's usually postgres://postgres:postgres@localhost:54322/postgres
        // Let's try default user/pass for local dev if missing
        console.log('Trying default local connection string...');
    }

    const client = new Client({
        connectionString: connectionString || 'postgres://postgres:postgres@localhost:54322/postgres',
    });

    try {
        await client.connect();
        console.log('Connected.');

        const sql = `
        -- Enable RLS
        ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

        -- Drop existing to avoid conflict
        DROP POLICY IF EXISTS "Allow read access for authenticated users" ON ai_providers;
        DROP POLICY IF EXISTS "Allow read access for anon" ON ai_providers;

        -- Re-create policies
        CREATE POLICY "Allow read access for authenticated users" ON ai_providers
        FOR SELECT
        TO authenticated
        USING (true);

        CREATE POLICY "Allow read access for anon" ON ai_providers
        FOR SELECT
        TO anon
        USING (true);
        `;

        await client.query(sql);
        console.log('Migration applied successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

main();
