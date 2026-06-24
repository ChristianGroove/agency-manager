const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@127.0.0.1:55322/postgres');
client.connect()
    .then(() => client.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'invoices'"))
    .then(r => {
        console.table(r.rows);
        client.end();
    })
    .catch(console.error);
