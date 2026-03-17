
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PERMISSIONS } from "@/modules/core/iam/permissions";

async function repair() {
    console.log("Repairing permissions for 'dannicel' organizations...");
    
    // 1. Find organizations matching 'dannicel'
    const { data: orgs } = await supabaseAdmin
        .from('organizations')
        .select('id, name, owner_id')
        .ilike('name', '%dannicel%');
    
    if (!orgs || orgs.length === 0) {
        console.log("No matching organizations found.");
        return;
    }

    for (const org of orgs) {
        console.log(`\n--- Processing Org: ${org.name} (${org.id}) ---`);
        
        // Find owner email
        const { data: ownerProfile } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name')
            .eq('id', org.owner_id)
            .single();
        console.log(`Owner: ${ownerProfile?.full_name || 'N/A'} (${ownerProfile?.email || 'N/A'})`);

        // 2. Get roles
        const { data: roles } = await supabaseAdmin
            .from('organization_roles')
            .select('*')
            .eq('organization_id', org.id);
        
        if (!roles) continue;

        for (const role of roles) {
            console.log(`  Role: ${role.name} (ID: ${role.id})`);
            const p = role.permissions || {};
            const newP = { ...p };
            let changed = false;

            // Mapping legacy -> new
            const mapping: Record<string, string> = {
                'org.manage_members': PERMISSIONS.ORG.MANAGE_MEMBERS,
                'org.manage_roles': PERMISSIONS.ORG.MANAGE_ROLES,
                'org.manage_settings': PERMISSIONS.ORG.MANAGE_BILLING, // Closest match
                'org.view_audit': PERMISSIONS.ORG.VIEW_AUDIT_LOGS,
                'crm.view': PERMISSIONS.CRM.VIEW_LEADS,
                'crm.edit': PERMISSIONS.CRM.EDIT_LEADS,
                'crm.delete': PERMISSIONS.CRM.DELETE_LEADS
            };

            for (const [oldKey, newKey] of Object.entries(mapping)) {
                if (p[oldKey] === true && p[newKey] !== true) {
                    newP[newKey] = true;
                    // delete newP[oldKey]; // Keep for safety or delete? Let's delete to clean up.
                    delete newP[oldKey];
                    changed = true;
                    console.log(`    Mapped ${oldKey} -> ${newKey}`);
                }
            }

            if (changed) {
                const { error: updateError } = await supabaseAdmin
                    .from('organization_roles')
                    .update({ permissions: newP })
                    .eq('id', role.id);
                
                if (updateError) {
                    console.error(`    Failed to update role ${role.name}:`, updateError);
                } else {
                    console.log(`    ✅ Updated role ${role.name}`);
                }
            } else {
                console.log(`    No changes needed.`);
            }
        }
    }
}

repair();
