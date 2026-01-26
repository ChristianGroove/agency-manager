
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
    const email = 'admin@pixy.com.co';
    const password = 'Password123!';

    // Check if user exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const existingUser = users.users.find(u => u.email === email);

    if (existingUser) {
        console.log(`User ${email} already exists. ID: ${existingUser.id}`);
        // Optional: Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: password }
        );
        if (updateError) {
            console.error('Error updating password:', updateError);
        } else {
            console.log('Password updated successfully.');
        }
    } else {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'super_admin' }
        });

        if (error) {
            console.error('Error creating user:', error);
        } else {
            console.log('User created:', data.user.id);
        }
    }
}

createAdminUser();
