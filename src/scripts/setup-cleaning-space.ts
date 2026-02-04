
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Robust env loading
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded .env.local');
} else {
    console.error('.env.local not found at', envPath);
    process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

// Direct admin client creation to avoid dependency issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase keys (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('🚀 Starting Cleaning Space Setup...');

    // 1. Ensure 'module_cleaning' exists
    console.log('1️⃣ Ensuring module_cleaning exists...');
    const { error: moduleError } = await supabase
        .from('system_modules')
        .upsert({
            key: 'module_cleaning',
            name: 'Cleaning Operations',
            description: 'Work orders, staff management, and service logistics.',
            category: 'operations',
            is_active: true,
            icon: 'Sparkles' // storing name of icon
        }, { onConflict: 'key' });

    if (moduleError) console.error('Error upserting module:', moduleError.message);
    else console.log('✅ Module ensured.');

    // 2. Ensure Vertical App exists
    console.log('2️⃣ Ensuring Vertical App (app_cleaning_pro) exists...');
    const appId = 'app_cleaning_pro';
    const { error: appError } = await supabase
        .from('saas_apps')
        .upsert({
            id: appId,
            name: 'Cleaning Business Pro',
            slug: 'cleaning-business-pro',
            category: 'cleaning',
            is_active: true,
            sort_order: 2
        }, { onConflict: 'id' });

    if (appError) console.error('Error upserting app:', appError.message);
    else console.log('✅ App ensured.');

    // 2.5 Ensure 'cleaning' is in 'verticals' table (for FK constraints)
    console.log('2️⃣.5️⃣ Ensuring verticals table has cleaning...');
    const { error: vertError } = await supabase
        .from('verticals')
        .upsert({
            key: 'cleaning',
            name: 'Cleaning & Maintenance',
            description: 'Professional cleaning services',
            icon: 'Sparkles'
        }, { onConflict: 'key' });

    if (vertError) console.log('⚠️ Verticals table error (might not exist):', vertError.message);
    else console.log('✅ Vertical ensured in verticals table.');

    // 3. Link Module to App (Try both tables to covers bases)
    console.log('3️⃣ Linking Module to App...');

    // Try saas_app_modules
    const { error: linkError1 } = await supabase
        .from('saas_app_modules')
        .upsert({
            app_id: appId,
            module_key: 'module_cleaning',
            auto_enable: true,
            is_core: true
        }, { onConflict: 'app_id, module_key' });

    if (linkError1) console.log('⚠️ saas_app_modules link failed (might not exist):', linkError1.message);
    else console.log('✅ Linked in saas_app_modules');

    // Try vertical_modules (Legacy? Or Actions source?)
    const { error: linkError2 } = await supabase
        .from('vertical_modules')
        .upsert({
            vertical_key: 'cleaning', // key usually matches category or slug
            module_key: 'module_cleaning'
        }, { onConflict: 'vertical_key, module_key' });

    if (linkError2) console.log('⚠️ vertical_modules link failed (might not exist):', linkError2.message);
    else console.log('✅ Linked in vertical_modules');


    // 4. Create User
    const email = 'demo.cleaning@pixy.com';
    const password = 'password123';
    console.log(`4️⃣ Creating/Getting User: ${email}...`);

    let userId: string | null = null;

    // Check if exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        console.log('👤 User already exists in Auth.');
        userId = existingUser.id;
    } else {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (createError) {
            console.error('❌ Error creating user:', createError.message);
            process.exit(1);
        }
        userId = newUser.user.id;
        console.log('👤 User created.');
    }

    // 5. Create Organization
    console.log('5️⃣ Creating Organization...');
    let orgId: string | null = null;

    // Check if user has orgs
    const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', userId);

    if (members && members.length > 0) {
        orgId = members[0].organization_id;
        console.log(`🏢 User already belongs to organization ID: ${orgId}`);

        // Update it
        await supabase.from('organizations').update({
            name: 'Cleaning Corp Demo',
            vertical_key: 'cleaning', // Important for polymorphic dashboard
            manual_module_overrides: ['module_cleaning'] // Safety net
        }).eq('id', orgId);
        console.log('✅ Organization updated with vertical_key="cleaning"');

    } else {
        // Create new Org
        // Insert directly if RLS allows or use admin function
        const { data: newOrg, error: orgCreateError } = await supabase
            .from('organizations')
            .insert({
                name: 'Cleaning Corp Demo',
                slug: 'cleaning-demo-corp',
                vertical_key: 'cleaning',
                manual_module_overrides: ['module_cleaning'],
                organization_type: 'client'
            })
            .select()
            .single();

        if (orgCreateError) {
            console.error('❌ Error creating org:', orgCreateError.message);
            // It might be because of RLS. Admin client *should* bypass RLS? 
            // Yes, service_role key bypasses RLS.
        } else {
            orgId = newOrg.id;
            console.log(`✅ Organization created: ${orgId}`);

            // Link Member
            await supabase.from('organization_members').insert({
                organization_id: orgId,
                user_id: userId,
                role: 'owner'
            });
            console.log('✅ User linked as Owner.');
        }
    }

    console.log('\n🎉 SETUP COMPLETE!');
    console.log(`👉 Login with: ${email} / ${password}`);
    console.log('   (Or use Magic Link in real app)');
}

main().catch(console.error);
