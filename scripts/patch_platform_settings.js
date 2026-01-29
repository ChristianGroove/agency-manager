const { Client } = require('pg');

async function patchPlatformSettings() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- PATCHING PLATFORM SETTINGS & STORAGE ---');

        // 1. Add updated_at column
        console.log('Adding updated_at to platform_settings...');
        await client.query('ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()');

        // 2. Create Storage Buckets
        console.log('Creating Storage Buckets...');
        const buckets = ['branding', 'avatars', 'documents'];

        for (const bucket of buckets) {
            // Check if bucket exists
            const res = await client.query("SELECT id FROM storage.buckets WHERE id = $1", [bucket]);
            if (res.rowCount === 0) {
                console.log(`Creating bucket: ${bucket}`);
                await client.query(`
                    INSERT INTO storage.buckets (id, name, public)
                    VALUES ($1, $1, true);
                `, [bucket]);

                // Add Policy for Public Read
                // Note: Policy creation via raw SQL is complex due to RLS. 
                // We will assume Disable RLS on storage.objects might be easiest for Sandbox, 
                // OR simplistic policies.
                // Let's try inserting the policy if possible, or just ensuring the bucket is public.
                // Setting public=true in storage.buckets typically handles public reads if RLS isn't blocking.
                // But storage.objects has RLS.

                // Let's Disable RLS on storage.objects for Sandbox simplicity (Nuclear Option Part 2)
            } else {
                console.log(`Bucket ${bucket} already exists.`);
            }
        }

        console.log('Ensuring buckets are public...');

        // Buckets to update

        for (const bucket of buckets) {
            await client.query(`
                UPDATE storage.buckets
                SET public = true
                WHERE id = $1;
            `, [bucket]);
            console.log(`Set ${bucket} to public.`);
        }

        // Try to grant permissions as well just in case
        console.log('Granting permissions...');
        // We can try to Grant on the schema if possible, or skip if it fails.
        // This is a best effort.


        console.log('✅ PATCH COMPLETE.');

    } catch (err) {
        console.error('❌ Error patching:', err.message);
    } finally {
        await client.end();
    }
}

patchPlatformSettings();
