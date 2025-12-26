
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or Anon Key');
    process.exit(1);
}

// Mimic the app's client (using anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogEvent() {
    console.log('Attempting to log a test event using ANON KEY...');

    const testPayload = {
        entity_type: 'verification_probe',
        entity_id: crypto.randomUUID(), // Valid UUID
        event_type: 'manual_verification',
        payload: { message: 'Checking write permissions with valid UUID' },
        triggered_by: 'system',
        actor_id: crypto.randomUUID() // Valid UUID
    };

    const { data, error } = await supabase
        .from('domain_events')
        .insert(testPayload)
        .select();

    if (error) {
        console.error('❌ Insert FAILED:', error.message);
        if (error.code === '42501') {
            console.error('   Reason: Permission denied (RLS policy might be blocking Anon inserts)');
        }
        process.exit(1);
    }

    console.log('✅ Insert SUCCESSFUL!');
    console.log('Inserted event:', data);
    process.exit(0);
}

testLogEvent();
