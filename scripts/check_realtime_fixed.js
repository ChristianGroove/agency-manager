
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRealtime() {
  console.log('--- Checking Realtime Configuration ---');
  
  try {
    // Check publication via RPC if possible or simple SELECT
    // Since we know the schema, we'll try to find any info.
    
    console.log('Testing connection...');
    const { data: testData, error: testErr } = await supabase.from('conversations').select('id').limit(1);
    if (testErr) throw testErr;
    console.log('Connection OK. Found conversation:', testData[0]?.id);

    // If we reach here, connectivity is fine.
    // The delay is likely REPLICA IDENTITY or PUBLICATION missing.
    
  } catch (err) {
    console.error('Check failed:', err.message);
  }
}

checkRealtime();
