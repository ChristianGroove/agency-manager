import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const url = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function main() {
  console.log('Connecting to local Postgres on 55322...');
  const sql = postgres(url, { max: 1 });

  const migrationFile = path.join(process.cwd(), 'supabase/migrations/20260816000000_universal_catalog_portal.sql');
  console.log(`Reading migration: ${migrationFile}`);
  const migrationSql = fs.readFileSync(migrationFile, 'utf8');

  console.log('Executing migration...');
  await sql.unsafe(migrationSql);
  console.log('✅ Migration applied successfully!');

  // Verify tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%catalog%' OR table_name LIKE '%attribute%' OR table_name LIKE '%variant%' OR table_name LIKE '%addon%';
  `;
  console.log('Created tables:', tables.map(t => t.table_name));

  await sql.end();
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
