const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function updateVertical() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
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
