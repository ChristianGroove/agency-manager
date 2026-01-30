
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.sandbox') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env.sandbox");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSocialTable() {
    console.log("🔧 Fixing 'meta_social_metrics' table...");

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.meta_social_metrics (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
            snapshot_date TIMESTAMPTZ DEFAULT NOW(),
            facebook_data JSONB DEFAULT '{}'::jsonb,
            instagram_data JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add unique constraint to avoid duplicate snapshots for same moment (optional, but good for upserts on date)
        -- Actually actions.ts upserts on client_id to keep "latest", so let's ensure client_id is unique OR we just rely on ID.
        -- actions.ts says: upsert({...}, { onConflict: 'client_id' }) 
        -- This implies client_id MUST be a unique constraint or primary key for that upsert to work as a "Current State" cache.
        
        ALTER TABLE public.meta_social_metrics DROP CONSTRAINT IF EXISTS meta_social_metrics_client_id_key;
        ALTER TABLE public.meta_social_metrics ADD CONSTRAINT meta_social_metrics_client_id_key UNIQUE (client_id);

        -- RLS
        ALTER TABLE public.meta_social_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Policy: Public read (or authenticated)
        create policy "Public read"
        on public.meta_social_metrics for select
        using ( true );

        create policy "Service role full access"
        on public.meta_social_metrics for all
        using ( true );
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });

    // Fallback if exec_sql RPC doesn't exist (common in some setups), we might need to use the SQL editor or a workaround.
    // But usually I have 'exec_sql' or similar in these environments. 
    // If this fails, I'll print the SQL for the user to run.

    if (error) {
        console.error("❌ RPC Error (Auto-fix failed):", error.message);
        console.log("\n⚠️  PLEASE RUN THIS SQL IN SUPABASE SQL EDITOR:\n");
        console.log(createTableSQL);
    } else {
        console.log("✅ Table 'meta_social_metrics' created/verified successfully.");
    }
}

// Check if we can run SQL via RPC, if not warn user.
fixSocialTable();
