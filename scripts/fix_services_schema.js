
const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load sandbox env
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.sandbox')));

// Reconstruct DB URL (same as other recovery scripts)
const dbUrl = envConfig.DATABASE_URL || `postgresql://postgres.${envConfig.SUPABASE_PROJECT_ID}:${envConfig.SUPABASE_DB_PASSWORD}@aws-0-${envConfig.SUPABASE_REGION}.pooler.supabase.com:5432/postgres?sslmode=require`;

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Sandbox specific
});

async function fixSchema() {
    try {
        await client.connect();
        console.log('🔌 Connected to Sandbox Database');

        console.log('🔍 Checking "services" table...');

        // 1. Add organization_id to services
        console.log('🛠 Adding "organization_id" to "services"...');
        await client.query(`
            ALTER TABLE public.services 
            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
        `);
        console.log('✅ Column "organization_id" added (or already existed).');

        // 2. Backfill organization_id if null?
        // Basic heuristic: specific emitter -> organization
        // For now, we leave it nullable or manual update might be needed, 
        // but the code just needs the column to exist to Query it.

        // 3. Verify
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'services' AND column_name = 'organization_id';
        `);

        if (res.rows.length > 0) {
            console.log('✅ VERIFIED: "organization_id" is present in "services".');
        } else {
            console.error('❌ FAILED: "organization_id" was NOT found after ALTER table.');
        }

    } catch (err) {
        console.error('❌ Error executing schema fix:', err);
    } finally {
        await client.end();
    }
}

fixSchema();
