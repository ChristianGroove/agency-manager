import postgres from 'postgres';

const url = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function main() {
  const sql = postgres(url, { max: 1 });

  console.log('Adding is_active column to service_catalog if not exists...');
  await sql`
    ALTER TABLE service_catalog 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  `;
  await sql`NOTIFY pgrst, 'reload schema'`;
  console.log('✅ is_active added and schema reloaded!');

  await sql.end();
}

main();
