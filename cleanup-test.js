const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteTest() {
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('phone', '1234567890');

    if (error) console.error(error);
    else console.log('Cleaned up test conversation.');
}

deleteTest();
