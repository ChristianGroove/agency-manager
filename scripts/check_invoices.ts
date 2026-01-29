
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log("🔍 Checking Invoices Table...");

    const { data, error } = await supabase.from('invoices').select('id, status, client_id, total_amount').limit(1);

    if (error) {
        console.log("❌ Invoices Check Failed:", error.message);
    } else {
        console.log("✅ Invoices Table Found. Rows:", data?.length);
        if (data && data.length > 0) console.log("   Sample:", data[0]);
    }
}

run();
