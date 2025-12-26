const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Try to get DATABASE_URL, or construct it if possible (Supabase usually provides it in env)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL or POSTGRES_URL in .env.local');
    // Fallback? No, we need it.
    process.exit(1);
}

async function applyMigration() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: node apply-ddl.js <path-to-sql-file>');
        process.exit(1);
    }

    const sqlPath = args[0];
    const fullPath = path.resolve(sqlPath);

    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        process.exit(1);
    }

    console.log(`Applying migration: ${fullPath}`);
    const sql = fs.readFileSync(fullPath, 'utf8');

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Supabase requires SSL
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        await client.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
