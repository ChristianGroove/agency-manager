const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLilianaQuotes() {
    console.log('--- AUDIT: Liliana Quotes ---');
    const clientId = '95e7f87f-d209-44d6-8b33-497b06c72a51';

    // 1. Fetch Quotes
    const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    console.log(`Found ${quotes.length} Quotes:`);

    quotes.forEach(q => {
        console.log(`\nQuote #${q.number}: ${q.title}`);
        console.log(`Total: $${q.total}`);
        console.log(`Status: ${q.status}`);
        console.log(`Created: ${q.created_at}`);
        console.log(`Converted To Invoice: ${q.invoice_id}`);
        console.log('Items:');
        console.dir(q.items, { depth: null });
    });
}

auditLilianaQuotes();
