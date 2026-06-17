import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to local database.");

    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', 'archive', '20260103010000_storage_buckets.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing SQL...");
    await client.query(sql);
    console.log("Storage policies created successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
