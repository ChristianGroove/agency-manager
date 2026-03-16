const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
    });
    
    try {
        await client.connect();
        const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260315200000_get_paginated_leads_rpc.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log("Applying RPC migration...");
        await client.query(migrationSql);
        console.log("✅ RPC migration applied successfully!");
    } catch (err) {
        console.error("❌ Failed to apply migration:", err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await client.end();
    }
}

main();
