
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
    console.log("🚀 Starting verification migration...");

    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
        console.error("❌ No database URL found in environment");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260102100000_core_work_orders.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`📜 Read sql from ${migrationPath}, length: ${sql.length}`);

    try {
        const client = await pool.connect();
        try {
            console.log("🔌 Connected. Executing SQL...");
            await client.query(sql);
            console.log("✅ Migration verified/applied successfully!");
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("❌ Error executing migration:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
