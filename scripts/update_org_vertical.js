const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function updateVertical() {
    const client = new Client({
        connectionString: 'postgresql://postgres.uqnsdylhyenfmfkxmkrn:Valentinfer1987*@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require'
    });

    try {
        await client.connect();
        const res = await client.query("UPDATE organizations SET vertical_key = 'agency' WHERE name = 'Pixy Agency'");
        console.log('Updated rows:', res.rowCount);
    } catch (err) {
        console.error('Update failed:', err.message);
    } finally {
        await client.end();
    }
}

updateVertical();
