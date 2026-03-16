const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function main() {
    const sql = postgres('postgresql://postgres:postgres@localhost:54322/postgres');
    
    try {
        const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260315200000_get_paginated_leads_rpc.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log("Applying RPC migration...");
        await sql.unsafe(migrationSql);
        console.log("✅ RPC migration applied successfully!");
    } catch (err) {
        console.error("❌ Failed to apply migration:", err.message);
    } finally {
        await sql.end();
    }
}

main();
