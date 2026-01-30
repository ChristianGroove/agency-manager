
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
// const pass = removed;
const r = 'us-west-2';

const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function checkLastClient() {
    try {
        await client.connect();

        console.log('🔍 Checking latest client...');

        const res = await client.query(`
            SELECT id, name, organization_id, status, created_at, deleted_at 
            FROM clients 
            ORDER BY created_at DESC 
            LIMIT 1;
        `);

        if (res.rows.length === 0) {
            console.log('❌ No clients found in DB.');
        } else {
            console.log('✅ Latest Client:');
            console.table(res.rows);

            // Check Org ID against the known one
            const knownOrgId = 'b35a477b-fa12-497f-9086-c62f3d6a8678';
            if (res.rows[0].organization_id === knownOrgId) {
                console.log('✅ Organization ID matches "Pixy Agency".');
            } else {
                console.error(`❌ Organization ID MISMATCH. Expected ${knownOrgId}, got ${res.rows[0].organization_id}`);
            }
        }

        // Also check if hosting_accounts causes issues?
        console.log('\n🔍 Checking hosting_accounts schema...');
        const resHosting = await client.query(`
             SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hosting_accounts';
        `);
        console.log('Cols:', resHosting.rows.map(r => r.column_name));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

checkLastClient();
