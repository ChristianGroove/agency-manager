
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
const pass = 'Valentinfer1987*';
const r = 'us-west-2';

const connectionString = 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require';

const client = new Client({ connectionString });

async function check() {
    try {
        await client.connect();

        console.log('🔍 Checking for duplicate user_ids...');

        const res = await client.query(`
            SELECT user_id, COUNT(*) 
            FROM user_preferences 
            GROUP BY user_id 
            HAVING COUNT(*) > 1;
        `);

        if (res.rows.length === 0) {
            console.log('✅ No duplicates found.');
        } else {
            console.log('❌ Duplicates found:');
            console.table(res.rows);

            // Delete duplicates?
            console.log('cleaning up duplicates...');
            await client.query(`
                DELETE FROM user_preferences a USING user_preferences b
                WHERE a.ctid < b.ctid AND a.user_id = b.user_id;
             `);
            console.log('✅ Duplicates removed.');
        }

        // Check if user_id is nullable
        const nullCheck = await client.query(`
            SELECT count(*) FROM user_preferences WHERE user_id IS NULL;
        `);
        if (parseInt(nullCheck.rows[0].count) > 0) {
            console.log('❌ Null user_ids found. Deleting them...');
            await client.query(`DELETE FROM user_preferences WHERE user_id IS NULL;`);
            console.log('✅ Nulls removed.');
        }

        // Try adding unique index instead of PK logic for now
        console.log('🛠 Adding UNIQUE constraint...');
        try {
            await client.query(`
                ALTER TABLE user_preferences ADD CONSTRAINT user_prefs_unique_user UNIQUE (user_id);
            `);
            console.log('✅ Unique constraint added.');
        } catch (e) {
            console.log('⚠️ ' + e.message);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

check();
