
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConversations() {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching conversation sample:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in conversations table:', Object.keys(data[0]));
    }
}

checkConversations();
