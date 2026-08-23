import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const targetEmail = 'pixyspaces1@gmail.com';
    console.log(`Checking user access for: ${targetEmail}...`);

    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
        console.error('Error listing users:', listErr);
        return;
    }

    let user = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

    if (!user) {
        console.log(`User ${targetEmail} not found. Creating user now...`);
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
            email: targetEmail,
            password: 'Password123!',
            email_confirm: true,
            user_metadata: { full_name: 'Admin Real Estate' }
        });
        if (createErr) {
            console.error('Error creating user:', createErr);
            return;
        }
        user = created.user;
    } else {
        console.log(`User found (ID: ${user.id}). Confirming email and setting password 'Password123!'...`);
        const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true,
            password: 'Password123!',
            user_metadata: { ...user.user_metadata, full_name: user.user_metadata?.full_name || 'Admin Real Estate' }
        });
        if (updateErr) {
            console.error('Error updating user:', updateErr);
            return;
        }
        user = updated.user;
    }

    // Check organizations for this user
    const { data: members } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations(id, name, slug, active_app_id)')
        .eq('user_id', user.id);

    console.log('\n--- ORGANIZATIONS FOR THIS USER ---');
    console.log(JSON.stringify(members, null, 2));

    // Generate Direct Magic Link for local testing
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
        options: {
            redirectTo: 'http://localhost:3000/dashboard'
        }
    });

    console.log('\n--- CREDENCIALES DE ACCESO LOCAL ---');
    console.log(`Email: ${targetEmail}`);
    console.log(`Contraseña: Password123!`);
    console.log(`URL de Login directo: http://localhost:3000/login`);
    if (linkData?.properties?.action_link) {
        console.log(`\nEnlace Mágico de 1-Clic: ${linkData.properties.action_link}`);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
