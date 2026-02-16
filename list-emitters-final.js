const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listEmittersFinal() {
    console.log('--- List Emitters Final ---');
    const { data: emitters } = await supabase.from('emitters').select('*');

    emitters.forEach(e => {
        console.log(`ID: ${e.id}`);
        console.log(`  Name: ${e.name}`);
        console.log(`  Legal: ${e.legal_name}`);
        console.log(`  Business: ${e.business_name}`);
        console.log('---');
    });
}

listEmittersFinal();
