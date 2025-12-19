const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const sqlPath = path.join(__dirname, '../../supabase/migrate-missing-services.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration from:', sqlPath);

    // Supabase JS client doesn't support running raw SQL strings directly via public API easily for security.
    // However, for this dev environment, we can assume we might need to use the Postgres connection or a workaround.
    // BUT, the specific request is "how will it be handled?". 
    // I should actually just USE the `run_command` to cat the file? No, I need to execute it.
    // Since I can't easily run SQL file via JS client without a stored procedure, 
    // I will try to use the `npx supabase db reset` or similar if I were using the CLI fully, but I am in a state where I might not have CLI auth.
    // Wait, the user has `npx supabase` logic.
    // Actually, I can use the trick of creating a temporary function via RPC if I really need to, OR just explain to the user.
    // But I entered "Agentic" mode to solve it.
    // The previous turns used `seed-services.js` which did inserts via JS. 
    // My migration script is SQL.
    // I will translate the SQL logic to JS to be safe and runnable.

    // Changing approach: I will write a JS migration script instead of pure SQL runner
    // because running raw SQL file via `supabase-js` requires specific setup (e.g. pg driver or RPC).
    // JS Logic is safer here given the toolset.
    console.log("Switching to JS-based migration for reliability...");

    // 1. Fetch Subscriptions
    const { data: subs, error: subsError } = await supabase.from('subscriptions').select('*');
    if (subsError) { console.error('Error fetching subscriptions:', subsError); return; }

    console.log(`Found ${subs.length} subscriptions to migrate.`);

    for (const sub of subs) {
        // Check if exists
        const { data: existing } = await supabase.from('services')
            .select('id')
            .eq('client_id', sub.client_id)
            .eq('name', sub.name)
            .single();

        if (!existing) {
            const type = sub.frequency === 'one-time' ? 'one_off' : 'recurring';
            const description = `Migrated Subscription: ${sub.service_type} (${sub.frequency})`;

            const { error: insertError } = await supabase.from('services').insert({
                client_id: sub.client_id,
                name: sub.name,
                description: description,
                status: sub.status,
                start_date: sub.start_date,
                type: type
            });

            if (insertError) console.error(`Failed to migrate subscription ${sub.name}:`, insertError);
            else console.log(`Migrated: ${sub.name}`);
        } else {
            console.log(`Skipped (already exists): ${sub.name}`);
        }
    }

    // 2. Fetch Hosting
    const { data: hosting, error: hostError } = await supabase.from('hosting_accounts').select('*');
    if (hostError) { console.error('Error fetching hosting:', hostError); return; }

    console.log(`Found ${hosting.length} hosting accounts to migrate.`);

    for (const host of hosting) {
        const name = `Hosting: ${host.domain}`;
        const { data: existing } = await supabase.from('services')
            .select('id')
            .eq('client_id', host.client_id)
            .eq('name', name)
            .single();

        if (!existing) {
            const description = `Provider: ${host.provider}. Renewal: ${host.renewal_date}`;

            const { error: insertError } = await supabase.from('services').insert({
                client_id: host.client_id,
                name: name,
                description: description,
                status: host.status,
                start_date: host.start_date,
                end_date: host.renewal_date,
                type: 'recurring'
            });

            if (insertError) console.error(`Failed to migrate hosting ${name}:`, insertError);
            else console.log(`Migrated: ${name}`);
        } else {
            console.log(`Skipped (already exists): ${name}`);
        }
    }

    console.log("Migration complete.");
}

runMigration();
