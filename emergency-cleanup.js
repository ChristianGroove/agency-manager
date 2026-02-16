const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    // Look for invoices created in the last 2 hours (since the bad deploy around 8:00 PM)
    // Current time is approx 9:00 PM. So 2 hours is safe.
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    console.log(`Searching for invoices created after: ${cutoff}`);

    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, number, total, created_at, client:clients(name)')
        .gte('created_at', cutoff);

    if (error) {
        console.error(error);
        return;
    }

    if (!invoices || invoices.length === 0) {
        console.log('No recent invoices found to delete.');
        return;
    }

    console.log(`Found ${invoices.length} invoices to delete:`);
    invoices.forEach(i => console.log(`${i.number} - ${i.client?.name} - ${i.total} - ${i.created_at}`));

    // DELETE
    console.log('--- DELETING NOW ---');
    for (const inv of invoices) {
        const { error: delError } = await supabase.from('invoices').delete().eq('id', inv.id);
        if (delError) console.error(`Failed to delete ${inv.id}:`, delError);
        else console.log(`Deleted ${inv.id}`);
    }
}

cleanup();
