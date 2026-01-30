
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
    let dbUrl =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.SUPABASE_DB_URL ||
        process.env.POSTGRES_URL_NON_POOLING;

    // Try to construct if missing
    if (!dbUrl && process.env.SUPABASE_DB_PASSWORD) {
        // Try Local Supabase Default Port (54322)
        console.log('Trying constructed URL with port 54322...');
        const url1 = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@127.0.0.1:54322/postgres`;
        try {
            await runMigration(url1);
            return;
        } catch (e) {
            console.error('Failed on 54322, trying 5432...');
        }

        // Try Standard Port (5432)
        const url2 = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@127.0.0.1:5432/postgres`;
        try {
            await runMigration(url2);
            return;
        } catch (e) {
            console.error('Failed on 5432.');
        }
    }

    if (!dbUrl) {
        console.error('Could not determine DATABASE_URL.');
        process.exit(1);
    }

    await runMigration(dbUrl);
}

async function runMigration(url: string) {
    const sql = postgres(url, { max: 1 });
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260130173000_seed_missing_styles.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Applying migration to ${url.split('@')[1]}...`);
    await sql.unsafe(migrationSql);
    console.log('Migration applied successfully.');
    await sql.end();
}

run();
