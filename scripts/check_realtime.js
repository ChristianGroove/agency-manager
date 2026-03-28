
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRealtime() {
  console.log('--- Checking Realtime Configuration ---');
  
  // 1. Check if 'conversations' is in 'supabase_realtime' publication
  const { data: pubData, error: pubError } = await supabase.from('pg_publication_tables' as any)
    .select('*')
    .eq('pubname', 'supabase_realtime')
    .eq('tablename', 'conversations');
    
  if (pubError) {
    // If table not accessible via PostgREST, try raw SQL if an exec function exists
    console.log('Could not check pg_publication_tables directly:', pubError.message);
  } else {
    console.log('Publication Data:', pubData);
  }

  // 2. Check table definition (Replica Identity)
  // We can infer this by trying to listen to an update if we were in a browser, 
  // but here we just check systemic access.
}

checkRealtime();
