const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function inspectTable(tableName) {
    const client = new Client({
        connectionString: 'postgresql://postgres.uqnsdylhyenfmfkxmkrn:Valentinfer1987*@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require'
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
        `, [tableName]);
        console.log(`--- Schema for ${tableName} ---`);
        console.table(res.rows);
    } catch (err) {
        console.error('Inspection failed:', err.message);
    } finally {
        await client.end();
    }
}

const table = process.argv[2];
if (table) {
    inspectTable(table);
} else {
    console.error('Please provide a table name');
}
