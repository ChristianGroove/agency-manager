"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

/**
 * Invite an owner to an organization
 * - Generates an invite link using Supabase Admin API
 * - Adds user to organization_members with 'owner' role
 * - Upserts profile if needed
 * - Returns the invite link for manual sharing (bypasses email delivery issues)
 */
export async function inviteOrgOwner(email: string, orgId: string) {
    await requireSuperAdmin()

    const headersList = await headers()
    // Prioritize configured app URL, then origin header, then fallback
    const origin = process.env.NEXT_PUBLIC_APP_URL || headersList.get('origin') || 'https://app.pixy.com.co'

    // 1. Generate Invite Link (Handle New vs Existing Users)
    let linkData, linkError;

    // First try: Invite (for new users)
    const result = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
            redirectTo: `${origin}/auth/callback?next=/platform`,
            data: { organization_id: orgId, role: 'owner' }
        }
    })

    linkData = result.data;
    linkError = result.error;

    // Second try: Magic Link (for existing users)
    if (linkError && linkError.message?.includes("already been registered")) {
        console.log('[inviteOrgOwner] User exists, generating magic link instead.');
        const resultExisting = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${origin}/auth/callback?next=/platform`,
                data: { organization_id: orgId, role: 'owner' }
            }
        })
        linkData = resultExisting.data;
        linkError = resultExisting.error;
    }

    if (linkError || !linkData) {
        console.error('[inviteOrgOwner] Link Generation Error:', linkError)
        throw new Error(`Failed to generate link: ${linkError?.message}`)
    }

    const user = linkData.user
    if (!user) {
        throw new Error('Failed to generate link: User object missing')
    }
    const userId = user.id
    // Cast to any because TS definitions might be outdated regarding 'properties'
    const inviteLink = (linkData as any).properties?.action_link

    // 2. Ensure Profile Exists (Platform Role)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            email: email,
            platform_role: 'user', // Default
            full_name: '',
            updated_at: new Date().toISOString()
        }, { onConflict: 'id', ignoreDuplicates: true })

    if (profileError) {
        console.warn('[inviteOrgOwner] Profile Warning:', profileError)
    }

    // 3. Add to Organization (as Owner)
    // We use organization_members table correctly now
    const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .upsert({
            organization_id: orgId,
            user_id: userId,
            role: 'owner',
        }, { onConflict: 'organization_id,user_id' })

    if (memberError) {
        console.error('[inviteOrgOwner] Membership Error:', memberError)
        // If membership fails, we should probably warn, but the user is created.
        throw new Error(`Failed to add user to organization: ${memberError.message}`)
    }

    // 4. Update Organization Owner ID (for fast lookup)
    await supabaseAdmin
        .from('organizations')
        .update({ owner_id: userId })
        .eq('id', orgId)

    revalidatePath(`/platform/admin/organizations/${orgId}`)

    // Return the link for the admin to copy
    return { success: true, userId, inviteLink }
}

/**
 * Remove user from organization
 */
export async function removeOrgUser(userId: string, orgId: string) {
    await requireSuperAdmin()

    const { error } = await supabaseAdmin
        .from('organization_members')
        .delete()
        .match({ organization_id: orgId, user_id: userId })

    if (error) throw error

    revalidatePath(`/platform/admin/organizations/${orgId}`)
    return { success: true }
}

// REMOVED manualSetUserPassword to prevent security risks
