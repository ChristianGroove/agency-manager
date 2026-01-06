"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

/**
 * Get members of the current active organization
 * Uses supabaseAdmin to bypass RLS and ensure all members are visible
 * SECURITY: Filters out platform super_admins from tenant views
 */
export async function getOrganizationMembers() {
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // Use admin client to bypass RLS on organization_members
    const { data: members, error } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error fetching members:", error)
        return []
    }

    if (!members || members.length === 0) return []

    // Fetch user profiles separately using admin
    const userIds = members.map(m => m.user_id)
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url, platform_role')
        .in('id', userIds)

    // Get emails from auth.users (admin only)
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) || [])
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Filter out platform super_admins - they should not be visible in tenant team views
    const platformAdminIds = new Set(
        profiles?.filter(p => p.platform_role === 'super_admin').map(p => p.id) || []
    )

    // Combine data and filter out platform admins
    return members
        .filter(member => !platformAdminIds.has(member.user_id))
        .map(member => ({
            ...member,
            user: {
                id: member.user_id,
                email: userMap.get(member.user_id) || 'Sin Email',
                full_name: profileMap.get(member.user_id)?.full_name || null,
                avatar_url: profileMap.get(member.user_id)?.avatar_url || null,
            }
        }))
}


/**
 * Invite a member to the current organization
 * Uses Admin API to generate link/create user if needed.
 */
export async function inviteMember(email: string, role: string = 'member') {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No active organization" }

    // Verify Admin/Owner permissions
    try {
        await requireOrgRole('admin')
    } catch (e) {
        return { success: false, error: "No tienes permisos para invitar miembros" }
    }

    const { getAdminUrlAsync } = await import('@/lib/utils')
    const origin = await getAdminUrlAsync('')
    const redirectUrl = await getAdminUrlAsync('/auth/callback?next=/dashboard')

    try {
        // 1. Generate Invite Link (Handle New vs Existing Users)
        let linkData, linkError;

        // First try: Invite (for new users)
        const result = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
                redirectTo: redirectUrl,
                data: { organization_id: orgId, role: role }
            }
        })

        linkData = result.data;
        linkError = result.error;

        // Second try: Magic Link (for existing users or if invite fails due to existence)
        if (linkError && linkError.message?.includes("already been registered")) {
            console.log('[inviteMember] User exists, generating magic link instead.');
            const resultExisting = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
                options: {
                    redirectTo: redirectUrl,
                    data: { organization_id: orgId, role: role }
                }
            })
            linkData = resultExisting.data;
            linkError = resultExisting.error;
        }

        if (linkError || !linkData) {
            throw new Error(`Failed to generate link: ${linkError?.message}`)
        }

        const user = linkData.user
        if (!user) throw new Error('Failed to generate link: User object missing')
        const userId = user.id

        // Cast to any to get properties
        const inviteLink = (linkData as any).properties?.action_link

        // 2. Ensure Profile Exists
        await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                platform_role: 'user',
                updated_at: new Date().toISOString()
            }, { onConflict: 'id', ignoreDuplicates: true })

        // 3. Add to Organization Members
        const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .upsert({
                organization_id: orgId,
                user_id: userId,
                role: role,
            }, { onConflict: 'organization_id,user_id' })

        if (memberError) {
            console.error('[inviteMember] Membership Error:', memberError)
            return { success: false, error: "Usuario creado pero falló asignación: " + memberError.message }
        }

        revalidatePath('/settings')
        return { success: true, inviteLink }

    } catch (error: any) {
        console.error("Invite Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Remove a member from the organization
 */
export async function removeMember(userId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No active organization" }

    // Verify Admin/Owner permissions
    try {
        await requireOrgRole('admin')
    } catch (e) {
        return { success: false, error: "No tienes permisos para eliminar miembros" }
    }

    // Prevent removing yourself (optional but good practice)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === userId) {
        return { success: false, error: "No puedes removerte a ti mismo." }
    }

    try {
        const { error } = await supabase
            .from('organization_members')
            .delete()
            .match({ organization_id: orgId, user_id: userId })

        if (error) throw error

        revalidatePath('/settings')
        return { success: true }
    } catch (error: any) {
        console.error("Remove Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Update a member's role
 */
export async function updateMemberRole(userId: string, newRole: 'admin' | 'member') {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No active organization" }

    // Only owners can change roles
    try {
        await requireOrgRole('owner')
    } catch (e) {
        return { success: false, error: "Solo el dueño puede cambiar roles" }
    }

    // Prevent changing owner role
    const { data: targetMember } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .match({ organization_id: orgId, user_id: userId })
        .single()

    if (targetMember?.role === 'owner') {
        return { success: false, error: "No se puede cambiar el rol del dueño" }
    }

    try {
        const { error } = await supabaseAdmin
            .from('organization_members')
            .update({ role: newRole })
            .match({ organization_id: orgId, user_id: userId })

        if (error) throw error

        revalidatePath('/platform/settings')
        return { success: true }
    } catch (error: any) {
        console.error("Update Role Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Update a member's granular permissions
 */
export async function updateMemberPermissions(
    userId: string,
    permissions: {
        modules?: Record<string, boolean>
        features?: Record<string, boolean>
    }
) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No active organization" }

    // Only owners and admins can edit permissions
    try {
        await requireOrgRole('admin')
    } catch (e) {
        return { success: false, error: "No tienes permisos para editar permisos" }
    }

    // Get current permissions to merge
    const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('permissions, role')
        .match({ organization_id: orgId, user_id: userId })
        .single()

    if (!member) {
        return { success: false, error: "Miembro no encontrado" }
    }

    // Cannot edit owner permissions
    if (member.role === 'owner') {
        return { success: false, error: "No se pueden editar los permisos del dueño" }
    }

    // Merge permissions
    const currentPermissions = member.permissions || {}
    const newPermissions = {
        modules: { ...currentPermissions.modules, ...permissions.modules },
        features: { ...currentPermissions.features, ...permissions.features },
    }

    try {
        const { error } = await supabaseAdmin
            .from('organization_members')
            .update({ permissions: newPermissions })
            .match({ organization_id: orgId, user_id: userId })

        if (error) throw error

        revalidatePath('/platform/settings')
        return { success: true, permissions: newPermissions }
    } catch (error: any) {
        console.error("Update Permissions Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Get a member's effective permissions (merged with role defaults)
 */
export async function getMemberPermissions(userId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('role, permissions')
        .match({ organization_id: orgId, user_id: userId })
        .single()

    if (!member) return null

    // Import defaults dynamically to avoid circular deps
    const { getEffectivePermissions } = await import('@/lib/permissions/defaults')

    return {
        role: member.role,
        permissions: getEffectivePermissions(member.role, member.permissions)
    }
}

/**
 * Get current logged-in user's permissions for the active organization
 * Used by client hooks to filter UI based on permissions
 */
export async function getCurrentUserPermissions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('role, permissions')
        .match({ organization_id: orgId, user_id: user.id })
        .single()

    if (!member) return null

    const { getEffectivePermissions } = await import('@/lib/permissions/defaults')

    return {
        role: member.role as string,
        permissions: getEffectivePermissions(member.role, member.permissions)
    }
}
