
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix fetch for node environments if needed (Node 18+ has native fetch)
// const fetch = require('node-fetch'); 

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://localhost:3000/api/internal/assistant/intent';

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("❌ Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
    console.log("🚦 Starting HTTP Endpoint Verification...");

    // 1. Get/Create Test User
    const email = 'tester@pixy.ai';
    const password = 'password123';
    let userId = '';

    console.log(`   > Authenticating as ${email}...`);

    // Try sign in first
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        // If fail, create user (auto confirm)
        console.log("   > User not found or pass wrong. Creating/Resetting...");
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Tester API' }
        });

        if (createError && !createError.message.includes('already registered')) {
            console.error("❌ Failed to create user:", createError);
            process.exit(1);
        }

        // Retry sign in
        const retry = await supabase.auth.signInWithPassword({ email, password });
        authData = retry.data;
        authError = retry.error;
    }

    if (!authData.session) {
        console.error("❌ Failed to get session:", authError);
        process.exit(1);
    }

    const token = authData.session.access_token;
    userId = authData.user.id;
    console.log("   ✅ Valid Session Token obtained.");

    // 2. Ensure User is in 'agency' org (Member)
    // Fetch a real existing org
    const { data: orgData } = await supabase.from('organizations').select('id').limit(1).single();
    if (!orgData) {
        console.error("❌ No Organizations found in DB. Seed basic data first.");
        process.exit(1);
    }
    const SANDBOX_ORG = orgData.id;
    console.log(`   > Using Organization ID: ${SANDBOX_ORG}`);

    // Quick SQL check to ensure membership (using Admin client)
    const { error: memberError } = await supabase.from('organization_members').upsert({
        organization_id: SANDBOX_ORG,
        user_id: userId,
        role: 'owner'
    });

    if (memberError) console.warn("   ⚠️ Warning: Could not upsert membership:", memberError.message);
    else console.log("   ✅ User membership enforced in Sandbox Org.");

    // 3. Test HTTP Endpoint
    console.log(`\n🚀 Sending POST to ${API_URL}...`);

    const payload = {
        intent_id: 'create_brief', // High Risk
        payload: { client: 'ACME Corp' }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                // Hack: Pass generic Supabase Cookie format just in case middleware needs it
                // 'Cookie': `sb-${process.env.NEXT_PUBLIC_SUPABASE_REFERENCE_ID}-auth-token=${token}` 
                // We'll try Standard Auth Header first.
            },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        const text = await response.text();

        console.log(`   Response Code: ${status}`);
        try {
            const json = JSON.parse(text);
            console.log("   Response Body:");
            console.dir(json, { depth: null, colors: true });

            if (status === 200 && json.status === 'proposed') {
                console.log("\n✅ VERIFICATION PASSED: Intent 'proposed' via HTTP.");
            } else if (status === 401) {
                console.error("\n❌ Auth Failed. Middleware might rely solely on Cookies.");
            } else {
                console.warn("\n⚠️ Unexpected Response.");
            }

        } catch (e) {
            console.log("   Response raw:", text);
        }

    } catch (netErr) {
        console.error("❌ Network Error:", netErr);
    }

}

run();
