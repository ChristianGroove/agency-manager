import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const url = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function main() {
  console.log('Connecting to local Postgres on 55322...');
  const sql = postgres(url, { max: 1 });

  const migrationFile = path.join(process.cwd(), 'supabase/migrations/20260822000000_add_real_estate_classification.sql');
  console.log(`Reading migration: ${migrationFile}`);
  const migrationSql = fs.readFileSync(migrationFile, 'utf8');

  console.log('Executing migration...');
  await sql.unsafe(migrationSql);
  console.log('✅ Real Estate Migration applied successfully!');

  // Notify PostgREST to reload schema
  try {
    await sql`NOTIFY pgrst, 'reload schema'`;
    console.log('✅ PostgREST schema cache reload signal sent.');
  } catch (e) {
    console.log('Note: PGRST notification skipped:', e);
  }

  await sql.end();
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
