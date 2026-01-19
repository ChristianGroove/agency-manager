const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCreds() {
    const { data: conn } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('provider_key', 'meta_business')
        .limit(1)
        .single();

    if (conn) {
        console.log('Connection ID:', conn.id);
        console.log('Credentials Keys:', Object.keys(conn.credentials));
        if (conn.credentials.pages) {
            console.log('Pages found in credentials:', conn.credentials.pages.length);
            console.log('First Page Keys:', Object.keys(conn.credentials.pages[0]));
        } else {
            console.log('No pages array in credentials.');
        }
        // Do not print full token for security, but check if access_token exists per page
        if (conn.credentials.pages && conn.credentials.pages.length > 0) {
            console.log('First Page has access_token:', !!conn.credentials.pages[0].access_token);
        }
    }
}

checkCreds();
