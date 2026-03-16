
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLead() {
    const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, metadata')
        .ilike('name', '%Christian Groove%')
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching lead:', error);
        return;
    }

    console.log('Lead found:', {
        id: data.id,
        name: data.name,
        phone: data.phone,
        call_permissions: data.metadata?.call_permissions || 'NONE'
    });
}

checkLead();
