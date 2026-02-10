
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    // Fallback to .env just in case
    dotenv.config();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Still missing credentials. Exiting.');
        process.exit(1);
    }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function main() {
    console.log('Connecting to:', url);

    const { data, error } = await supabase
        .from('organizations')
        .select('slug, name, manual_module_overrides')
        // .not('manual_module_overrides', 'is', null); // .not is tricky sometimes if column is null
        .not('manual_module_overrides', 'is', null);

    if (error) {
        console.error('Error querying organizations:', error);
    } else {
        console.log('--- Organizations with Manual Overrides ---');
        if (data && data.length > 0) {
            console.table(data);
        } else {
            console.log('No organizations found with manual overrides.');
        }
    }
}

main();
