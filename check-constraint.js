const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@127.0.0.1:55322/postgres');
client.connect()
    .then(() => client.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'invoices_document_type_check'"))
    .then(r => {
        console.log(r.rows);
        client.end();
    })
    .catch(console.error);
