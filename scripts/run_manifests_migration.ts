
import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    const migrationPath = path.join(projectDir, 'src/db/migrations/20260210_create_manifests_module.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration:', migrationPath);

    // Split by statement if needed, or run as one block if supported
    // Supabase-js rpc might be needed if raw sql isn't exposed, but pg via connection string is better.
    // Actually, supabase-js doesn't expose raw query easily without a specific function.
    // Let's try to use the `postgres` library if installed, or `pg`.
    // Checking package.json, `postgres` is installed.

    // Re-importing inside main or top level if I was using ESM, but here I'll just use dynamic import or assumption.
    // Wait, I can't use `postgres` lib if I don't have the connection string.
    // The env probably has DATABASE_URL?

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        console.log('Using DATABASE_URL from env');
        const postgres = require('postgres');
        const sqlClient = postgres(dbUrl);
        try {
            await sqlClient.unsafe(sql);
            console.log('Migration successful!');
        } catch (err) {
            console.error('Migration failed:', err);
        } finally {
            await sqlClient.end();
        }
    } else {
        console.error('DATABASE_URL not found in env. Cannot run migration directly.');
    }
}

main();
