const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// TARGET MIGRATION FILE
const migrationFile = 'supabase/migrations/20260130133000_add_smtp_configs.sql';

async function run() {
    let connectionString = process.env.DATABASE_URL;

    // IF DATABASE_URL is missing, try to construct it from standard Supabase vars
    if (!connectionString) {
        const password = process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_PASSWORD;
        const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (password && projectUrl) {
            // Extract Project ID: https://[PROJECT_ID].supabase.co
            const projectId = projectUrl.replace("https://", "").split(".")[0];
            const region = "us-west-2"; // Typical default, might be different but usually consistent for this user based on old scripts

            // Try Standard Pooler URL Construction
            // postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
            connectionString = `postgresql://postgres.${projectId}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;

            console.log(`⚠️  DATABASE_URL missing. Constructed from components: postgres://postgres.${projectId}:***@aws-0-${region}...`);
        }
    }

    if (!connectionString) {
        console.error('❌ Error: Could not determine DATABASE_URL. Please set DATABASE_URL or (SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL) in .env.local');
        // console.log("Current Env Keys:", Object.keys(process.env)); 
        process.exit(1);
    }

    console.log(`🔌 Connecting to database...`);

    // Validate string format roughly
    if (!connectionString.startsWith("postgres")) {
        console.error("❌ Invalid connection string format.");
        process.exit(1);
    }

    // Clean connection string of sslmode param if we are setting it manually
    if (connectionString.includes('?sslmode=')) {
        connectionString = connectionString.split('?')[0];
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase pooler
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully!');

        const sqlPath = path.join(process.cwd(), migrationFile);
        if (!fs.existsSync(sqlPath)) {
            console.error(`❌ Migration file not found: ${sqlPath}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(`📜 Executing migration: ${migrationFile}`);

        await client.query(sql);

        console.log('✨ Migration executed successfully.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
