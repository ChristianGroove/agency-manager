
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationFile = 'supabase/migrations/20260108000006_fix_role_localization.sql';
// Common local Supabase ports
const ports = [5432, 54322, 6543, 54321];

async function tryConnect(port) {
    const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
    console.log(`Trying port ${port}...`);
    const client = new Client({ connectionString, connectionTimeoutMillis: 2000 });
    try {
        await client.connect();
        console.log(`Connected successfully on port ${port}!`);
        return client;
    } catch (err) {
        // console.log(`Failed on ${port}: ${err.message}`);
        return null;
    }
}

async function run() {
    let client = null;

    for (const port of ports) {
        client = await tryConnect(port);
        if (client) break;
    }

    if (!client) {
        console.error('Could not connect to database on any common port.');
        process.exit(1);
    }

    try {
        const sql = fs.readFileSync(path.join(process.cwd(), migrationFile), 'utf8');
        console.log(`Executing migration: ${migrationFile}`);
        await client.query(sql);
        console.log('Migration executed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
