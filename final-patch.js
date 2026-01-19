
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const convId = '3621f31a-6eba-4c47-838f-4d7609fe2b4b';
    const pId = '990154037504132';

    console.log(`--- 🩹 FINAL PATCH for Convo: ${convId} ---`);
    const { error } = await supabase
        .from('conversations')
        .update({ metadata: { phoneNumberId: pId } })
        .eq('id', convId);

    if (error) {
        console.error("❌ Failed:", error);
    } else {
        console.log("✅ Success! The conversation is now ready for replies.");
    }
}
run();
