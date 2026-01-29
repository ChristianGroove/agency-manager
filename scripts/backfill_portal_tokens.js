
const { Client } = require('pg');
const crypto = require('crypto');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
const pass = 'Valentinfer1987*';
const r = 'us-west-2';

const connectionString = 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require';

const client = new Client({ connectionString });

function generateShortToken() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function fix() {
    try {
        await client.connect();

        console.log('🛠 Backfilling Portal Tokens...');

        // Get clients needing update
        const res = await client.query(`
            SELECT id FROM clients 
            WHERE portal_token IS NULL OR portal_short_token IS NULL
        `);

        console.log(`.. Found ${res.rows.length} clients to update.`);

        for (const row of res.rows) {
            const token = crypto.randomUUID();
            const shortToken = generateShortToken();

            await client.query(`
                UPDATE clients 
                SET 
                    portal_token = $1,
                    portal_short_token = $2,
                    portal_token_never_expires = true
                WHERE id = $3
            `, [token, shortToken, row.id]);

            process.stdout.write('.');
        }

        console.log('\n✅ All clients updated.');

        console.log('🔄 Reloading Schema Cache...');
        await client.query("NOTIFY pgrst, 'reload config'");

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

fix();
