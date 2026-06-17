import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE config");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking buckets...");
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error listing buckets:", listError);
    process.exit(1);
  }

  const exists = buckets.find(b => b.id === 'chat-attachments');
  if (exists) {
    console.log("Bucket 'chat-attachments' already exists.");
  } else {
    console.log("Creating bucket 'chat-attachments'...");
    const { data, error } = await supabase.storage.createBucket('chat-attachments', {
      public: true
    });
    if (error) {
      console.error("Error creating bucket:", error);
    } else {
      console.log("Bucket created successfully:", data);
    }
  }
}

run();
