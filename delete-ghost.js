const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteGhost() {
    console.log('--- Deleting Ghost Invoice (1.645M) ---');
    const ghostNumber = 'INV-1771122199769-6PB';

    // First verify it exists and is the 1.6M one
    const { data: stringCheck } = await supabase.from('invoices').select('id, total').eq('number', ghostNumber).single();

    if (stringCheck && stringCheck.total == 1645000) {
        const { error } = await supabase.from('invoices').delete().eq('id', stringCheck.id);
        if (!error) console.log('Successfully deleted ghost invoice.');
        else console.error('Error deleting:', error);
    } else {
        console.log('Ghost invoice not found or amount mismatch (already deleted?).');
    }
}

deleteGhost();
