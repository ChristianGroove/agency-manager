import postgres from 'postgres';

const url = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function main() {
  const sql = postgres(url, { max: 1 });

  // 1. Check columns of service_catalog
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'service_catalog';
  `;
  console.log('Columns of service_catalog in Postgres:');
  cols.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

  // 2. Notify PostgREST to reload schema
  console.log('Sending NOTIFY pgrst reload schema...');
  await sql`NOTIFY pgrst, 'reload schema'`;
  console.log('✅ Schema reload notified');

  await sql.end();
}

main();
