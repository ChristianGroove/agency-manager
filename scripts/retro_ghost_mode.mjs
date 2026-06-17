import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
    console.log("Fetching super admins...");
    const { data: profiles, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('platform_role', 'super_admin');
        
    if (pErr) throw pErr;
    
    const superAdminIds = profiles.map(p => p.id);
    console.log(`Found ${superAdminIds.length} super admins.`);

    console.log("Fetching child organizations...");
    // Find all organizations that have a parent_organization_id (i.e. child tenants)
    const { data: childOrgs, error: cErr } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .not('parent_organization_id', 'is', null);

    if (cErr) throw cErr;
    console.log(`Found ${childOrgs.length} child organizations.`);
    
    const childOrgIds = childOrgs.map(o => o.id);
    
    if (childOrgIds.length > 0 && superAdminIds.length > 0) {
        console.log("Applying ghost mode to super admins in child organizations...");
        
        // Find memberships
        const { data: memberships, error: mErr } = await supabaseAdmin
            .from('organization_members')
            .select('*')
            .in('user_id', superAdminIds)
            .in('organization_id', childOrgIds);
            
        if (mErr) throw mErr;
        
        console.log(`Found ${memberships.length} memberships to update.`);
        
        for (const m of memberships) {
            const currentPerms = m.permissions || {};
            if (!currentPerms.is_support_proxy) {
                const newPerms = { ...currentPerms, is_support_proxy: true };
                await supabaseAdmin
                    .from('organization_members')
                    .update({ permissions: newPerms })
                    .eq('organization_id', m.organization_id)
                    .eq('user_id', m.user_id);
                console.log(`Updated membership for user ${m.user_id} in org ${m.organization_id}`);
            } else {
                console.log(`Membership already has is_support_proxy for user ${m.user_id} in org ${m.organization_id}`);
            }
        }
    }
    
    console.log("Retroactive proxy patch completed!");
}

run().catch(console.error);
