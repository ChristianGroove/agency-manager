const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function listColumns() {
    // UPDATED: Using env vars instead of hardcoded string
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("DATABASE_URL not found in .env.local");
        return;
    }

    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `);
        console.log("All columns in public schema:");
        res.rows.forEach(row => {
            console.log(`${row.table_name}.${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

listColumns();
