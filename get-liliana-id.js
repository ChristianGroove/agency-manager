const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getLilianaId() {
    const email = 'contabilidad.carnavalmirador@gmail.com';
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('email', email);

    clients.forEach(c => {
        console.log('ID:', c.id);
        console.log('Name:', c.name);
    });
}

getLilianaId();
