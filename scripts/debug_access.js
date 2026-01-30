const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debugAccess() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    const USER_ID = '98046a47-7d19-42b1-a0d7-9c84e0577f4b';

    try {
        await client.connect();
        console.log('--- DEBUGGING RLS ACCESS ---');

        // 1. Check raw membership (admin bypass)
        const resRaw = await client.query('SELECT * FROM public.organization_members WHERE user_id = $1', [USER_ID]);
        console.log(`[RAW] Found ${resRaw.rowCount} memberships for user.`);
        if (resRaw.rowCount > 0) {
            console.log('[RAW] Member of Org:', resRaw.rows[0].organization_id);
        }

        // 2. Check get_auth_org_ids function output
        await client.query("SET request.jwt.claim.sub = '" + USER_ID + "'");
        await client.query("SET ROLE authenticated");

        try {
            const resFn = await client.query('SELECT * FROM public.get_auth_org_ids()');
            console.log(`[RLS Function] Returned ${resFn.rowCount} orgs.`);
        } catch (e) {
            console.log('[RLS Function] ERROR:', e.message);
        }

        // 3. Simulate RLS Query on organization_members
        try {
            const resMembers = await client.query(`
                SELECT * FROM public.organization_members 
                WHERE user_id = '${USER_ID}'
            `);
            console.log(`[RLS Query] organization_members: Found ${resMembers.rowCount} rows.`);
        } catch (e) {
            console.log('[RLS Query] ERROR:', e.message);
        }

    } catch (err) {
        console.error('❌ Error during debug:', err.message);
    } finally {
        await client.end();
    }
}

debugAccess();
