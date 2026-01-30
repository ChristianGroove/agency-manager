const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debugBilling() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- DEBUGGING BILLING AUTOMATION QUERY ---');

        // SELECT query from billing-automation.ts
        const query = `
            SELECT 
                bc.*,
                s.id as s_id,
                s.name as s_name,
                s.client_id as s_client_id,
                s.amount as s_amount,
                s.frequency as s_frequency,
                s.type as s_type,
                s.emitter_id as s_emitter_id,
                s.document_type as s_document_type,
                s.quantity as s_quantity,
                s.organization_id as s_organization_id,
                s.deleted_at as s_deleted_at,
                s.metadata as s_metadata
            FROM billing_cycles bc
            INNER JOIN services s ON bc.service_id = s.id
            WHERE bc.status = 'pending'
            AND s.deleted_at IS NULL
            AND bc.end_date <= NOW()
        `;

        console.log('Executing SELECT...');
        const res = await client.query(query);
        console.log(`Found ${res.rowCount} pending cycles.`);
        console.log('First Row:', res.rows[0]);

    } catch (err) {
        console.error('❌ Error executing billing query:', err.message);
    } finally {
        await client.end();
    }
}

debugBilling();
