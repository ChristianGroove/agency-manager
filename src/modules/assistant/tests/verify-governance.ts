
import { IntentService } from '../intent-service';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Or service role for bypass

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MOCK_CONTEXT_ADMIN = {
    tenant_id: '00000000-0000-0000-0000-000000000000', // Mock Org
    space_id: 'agency',
    user_id: 'd9b07172-132b-4275-a05e-855c829e3427', // Mock User
    role: 'owner',
    allowed_actions: [],
    active_modules: ['core', 'crm'],
    vertical: 'agency'
};

const MOCK_CONTEXT_UNAUTHORIZED = {
    ...MOCK_CONTEXT_ADMIN,
    space_id: 'clinic', // Wrong space
    role: 'member'
};

async function runTests() {
    console.log("🚦 Starting Governance Verification...");

    // 1. High Risk Test (Create Brief)
    console.log("\n🧪 Test 1: High Risk Intent (Create Brief)...");
    const res1 = await IntentService.proposeIntent(
        'create_brief',
        { client_id: '123', project_name: 'Test Project' },
        MOCK_CONTEXT_ADMIN,
        supabase
    );
    console.log(`   Result: [${res1.status}] ${res1.message}`);

    if (res1.status === 'proposed' && res1.risk_level === 'high') {
        console.log("   ✅ High Risk correctly requires confirmation.");
    } else {
        console.error("   ❌ Failed High Risk Check.");
    }

    // 2. Low Risk Test (List Pending)
    console.log("\n🧪 Test 2: Low Risk Intent (List Pending Payments)...");
    const res2 = await IntentService.proposeIntent(
        'list_pending_payments',
        {},
        MOCK_CONTEXT_ADMIN,
        supabase
    );
    console.log(`   Result: [${res2.status}] ${res2.message}`);

    if (res2.status === 'confirmed' && res2.risk_level === 'low') {
        console.log("   ✅ Low Risk correctly confirmed immediately.");
    } else {
        console.error("   ❌ Failed Low Risk Check.");
    }

    // 3. Validation Fail Test (Wrong Space/Intent)
    console.log("\n🧪 Test 3: Validation Failure (Invalid)...");
    const res3 = await IntentService.proposeIntent(
        'create_brief',
        {},
        MOCK_CONTEXT_UNAUTHORIZED,
        supabase
    );
    console.log(`   Result: [${res3.status}] ${res3.message}`);

    if (res3.status === 'rejected') {
        console.log("   ✅ Invalid Context correctly rejected.");
    } else {
        console.error("   ❌ Failed Rejection Check.");
    }

    // 4. Audit Log Check
    if (res1.log_id) {
        console.log("\n🔎 Verifying DB Audit Log...");
        const { data } = await supabase.from('assistant_intent_logs')
            .select('*')
            .eq('id', res1.log_id)
            .single();

        if (data) {
            console.log("   ✅ Log found in DB:", data.id, "| Status:", data.status, "| Risk:", data.risk_level);
        } else {
            console.error("   ❌ Log NOT found in DB.");
        }
    }
}

runTests().catch(console.error);
