import postgres from 'postgres';

const url = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function main() {
  const sql = postgres(url, { max: 1 });

  const orgCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organizations';
  `;
  console.log('Columns of organizations:');
  orgCols.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

  const settingsCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organization_settings';
  `;
  console.log('\nColumns of organization_settings:');
  settingsCols.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

  await sql.end();
}

main();
