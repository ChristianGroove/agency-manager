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

    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', 'archive', '20260118030000_secure_storage_policies.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ensure search_path includes public so 'conversations' is found
    sql = 'SET search_path = public, storage;\n' + sql;

    console.log("Executing SQL...");
    await client.query(sql);
    console.log("Secure storage policies created successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
