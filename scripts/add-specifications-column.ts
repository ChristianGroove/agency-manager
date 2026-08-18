import postgres from 'postgres';

const url = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function main() {
  const sql = postgres(url, { max: 1 });

  console.log('Adding specifications and helper columns to service_catalog if not exists...');
  await sql`
    ALTER TABLE service_catalog 
    ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;
  `;
  await sql`NOTIFY pgrst, 'reload schema'`;
  console.log('✅ Columns added and schema reloaded!');

  await sql.end();
}

main();
