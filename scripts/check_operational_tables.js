const { Client } = require('pg');

async function checkTables() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- CHECKING MISSING TABLES ---');

        const suspectedTables = [
            'crm_pipelines',
            'crm_stages',
            'pipeline_stages', // Checking alt name
            'channels',
            'communication_channels', // Checking alt name
            'quotes',
            'documents', // Quotes might be stored here
            'document_items'
        ];

        for (const t of suspectedTables) {
            const res = await client.query(`
                SELECT count(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            `, [t]);

            if (res.rows[0].count > 0) {
                console.log(`✅ FOUND: ${t}`);
            } else {
                console.log(`❌ MISSING: ${t}`);
            }
        }

    } catch (err) {
        console.error('❌ Error checking tables:', err.message);
    } finally {
        await client.end();
    }
}

checkTables();
