"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { MemberPermissions } from "@/lib/permissions/types"
import { revalidatePath, revalidateTag } from "next/cache"
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
        .select(`
            *,
            organization_roles (
                id,
                name,
                is_system_role
            )
        `)
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error fetching members:", error)
        return []
    }

    if (!members || members.length === 0) return []

    // Fetch user profiles and agent_channels separately using admin
    const userIds = members.map(m => m.user_id)
    
    // FETCH CHANNELS SEPARATELY (FIX for missing relationship join)
    const { data: agentChannels } = await supabaseAdmin
        .from('agent_channels')
        .select('*')
        .eq('organization_id', orgId)
        .in('agent_id', userIds)

    const channelsByAgent = new Map<string, any[]>()
    agentChannels?.forEach(ac => {
        const list = channelsByAgent.get(ac.agent_id) || []
        list.push({
            channel_type: ac.channel_type,
            is_active: ac.is_active
        })
        channelsByAgent.set(ac.agent_id, list)
    })

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
            permissions: member.permissions as unknown as MemberPermissions, // Ensure type safety
            role_id: member.role_id,
            // If they have a dynamic role, use its name, otherwise fallback to legacy enum
            role_name: (member as any).organization_roles?.name || member.role,
            agent_channels: channelsByAgent.get(member.user_id) || [], // Attach manually mapped channels
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
/**
 * Invite a member to the current organization
 * Uses Admin API to generate link/create user if needed.
 */
/**
 * Invite a member to the current organization
 * Uses Admin API to generate link/create user if needed.
 */
/**
 * Invite a member to the current organization
 * Uses Admin API to generate link/create user if needed.
 */
export async function inviteMember(email: string, roleId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No active organization" }
    if (!roleId || roleId.length < 30) return { success: false, error: "Rol invÃ¡lido (UUID requerido)" }

    // Verify Admin/Owner permissions
    try {
        await requireOrgRole('admin')
    } catch (e) {
        return { success: false, error: "No tienes permisos para invitar miembros" }
    }

    const { getAdminUrlAsync } = await import('@/lib/utils')
    const redirectUrl = await getAdminUrlAsync('/auth/confirm?next=/dashboard')

    try {
        // 1. Generate Invite Link (Handle New vs Existing Users)
        let linkData, linkError;

        // First try: Invite (for new users)
        const result = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
                redirectTo: redirectUrl,
                data: { organization_id: orgId, role: roleId }
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
                    data: { organization_id: orgId, role: roleId }
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

        const actionLink = (linkData as any).properties?.action_link
        const verificationType = (linkData as any).properties?.verification_type || 'invite'
        
        const { getSecureAuthLink } = await import('@/lib/auth-link-utils')
        const { getAuthRedirectBase } = await import('@/lib/auth-utils')
        const redirectBase = getAuthRedirectBase()
        const inviteLink = getSecureAuthLink(actionLink, verificationType, redirectBase, '/dashboard')

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
                role_id: roleId,
                role: 'member', // Keep as static fallback for legacy components, but role_id is the truth
            }, { onConflict: 'organization_id,user_id' })

        if (memberError) {
            console.error('[inviteMember] Membership Error:', memberError)
            return { success: false, error: "Usuario creado pero fallÃ³ asignaciÃ³n: " + memberError.message }
        }

        // 4. Send Invite Email (Custom SMTP / Resend)
        // Dynamically import to avoid top-level circular deps if any
        const { EmailService } = await import('@\/modules\/features\/notifications/email.service')

        await EmailService.send({
            to: email,
            subject: 'InvitaciÃ³n a unirse al equipo',
            html: `
                <h1>Has sido invitado</h1>
                <p>Te han invitado a unirte a una organizaciÃ³n en Pixy.</p>
                <p>Haz clic abajo para aceptar:</p>
                <p><a href="${inviteLink}" style="padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px;">Unirse Ahora</a></p>
            `,
            organizationId: orgId
        })

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

    // Prevent removing yourself
    const { data: { user } } = await (await createClient()).auth.getUser()
    if (user && user.id === userId) {
        return { success: false, error: "No puedes removerte a ti mismo." }
    }

    try {
        // Use admin client to bypass RLS, we already checked permissions above
        const { error } = await supabaseAdmin
            .from('organization_members')
            .delete()
            .match({ organization_id: orgId, user_id: userId })

        if (error) throw error

        // revalidateTag('permissions') - Removed due to build error in Next 16+
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
export async function updateMemberRole(userId: string, newRoleId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No active organization" }

    // Only owners/admins can change roles (checked by middleware usually, but here manually)
    // TODO: Use hasPermission(PERMISSIONS.ORG.MANAGE_MEMBERS)
    try {
        await requireOrgRole('admin') // Legacy check kept for safety, should upgrade
    } catch (e) {
        return { success: false, error: "No tienes permisos" }
    }

    try {
        const { error } = await supabaseAdmin
            .from('organization_members')
            .update({
                role_id: newRoleId,
                role: 'member'
            })
            .match({ organization_id: orgId, user_id: userId })

        if (error) throw error

        // revalidateTag('permissions')
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
        inbox_access?: string[]
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

    // Secure fetch including role data
    const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select(`
            permissions, 
            role,
            role_data:organization_roles (
                hierarchy_level
            )
        `)
        .match({ organization_id: orgId, user_id: userId })
        .single()

    if (!member) {
        return { success: false, error: "Miembro no encontrado" }
    }

    // Cannot edit owner permissions (Hierarchy 100) or if the role specifically says 'owner'
    const hierarchy = (member.role_data as any)?.hierarchy_level
    if (hierarchy === 100 || member.role === 'owner') {
        return { success: false, error: "No se pueden editar los permisos de un DueÃ±o de sistema" }
    }

    // Merge permissions
    const currentPermissions = member.permissions || {}
    const newPermissions = {
        ...currentPermissions,
        modules: { ...currentPermissions.modules, ...permissions.modules },
        features: { ...currentPermissions.features, ...permissions.features },
        ...(permissions.inbox_access !== undefined && { inbox_access: permissions.inbox_access })
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
        .select(`
            role, 
            permissions,
            role_data:organization_roles (
                name,
                permissions
            )
        `)
        .match({ organization_id: orgId, user_id: userId })
        .single()

    if (!member) return null

    // Merge logic: 1. Role, 2. Overrides
    const rolePermissions = (member.role_data as any)?.permissions || {}
    const memberOverrides = (member.permissions as any) || {}
    
    const effectivePermissions = {
        modules: { ...rolePermissions.modules, ...memberOverrides.modules },
        features: { ...rolePermissions.features, ...memberOverrides.features },
        ...rolePermissions,
        ...memberOverrides
    }

    const roleName = (member.role_data as any)?.name || member.role;

    return {
        role: roleName,
        permissions: effectivePermissions
    }
}

/**
 * Get current logged-in user's permissions for the active organization
 * Used by client hooks to filter UI based on permissions
 */
import { unstable_cache } from "next/cache"

/**
 * Internal: Fetch user permissions using admin client (Cacheable)
 */
async function _getUserPermissionsInternal(userId: string, orgId: string) {
    const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select(`
            role, 
            permissions,
            role_data:organization_roles (
                name,
                permissions,
                hierarchy_level
            )
        `)
        .match({ organization_id: orgId, user_id: userId })
        .single()

    if (!member) return null

    // Merge logic: 1. Role, 2. Overrides
    const rolePermissions = (member.role_data as any)?.permissions || {}
    const memberOverrides = (member.permissions as any) || {}
    
    // Effective permissions (simplified for now to match structure expected by frontend)
    // In long term, frontend should consume the unified IAM permission strings
    const effectivePermissions = {
        modules: { ...rolePermissions.modules, ...memberOverrides.modules },
        features: { ...rolePermissions.features, ...memberOverrides.features },
        ...rolePermissions,
        ...memberOverrides
    }

    const roleName = (member.role_data as any)?.name || member.role;
    const hierarchy = (member.role_data as any)?.hierarchy_level || 0;

    return {
        role: roleName.toLowerCase(),
        hierarchy: hierarchy,
        permissions: effectivePermissions
    }
}

/**
 * PERF: Cached version of permissions fetch (1 minute TTL)
 */
import { cache as reactCache } from "react"

/**
 * Get current logged-in user's permissions for the active organization.
 * Security: We use React's request-scoped cache() for deduplication within a single render cycle.
 * We REMOVE unstable_cache to ensure data is ALWAYS fresh from DB in production and prevent cross-user identity leaks.
 */
export const getCachedUserPermissions = reactCache(async (userId: string, orgId: string) => {
    return _getUserPermissionsInternal(userId, orgId)
})

/**
 * Get current logged-in user's permissions for the active organization
 * Used by client hooks to filter UI based on permissions
 */
export async function getCurrentUserPermissions(providedOrgId?: string | null) {
    const supabase = await createClient()
    // Optimization: Use providedOrgId or fall back to cookie/default
    const orgId = providedOrgId || await getCurrentOrganizationId()

    if (!orgId) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Use cached version
    return getCachedUserPermissions(user.id, orgId)
}

/**
 * Manually create a user with email and password
 * Only for Admins/Owners
 */
export async function createUserManually(data: {
    email: string,
    password: string,
    fullName: string,
    role: string
}) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No active organization" }

    // Verify Admin/Owner permissions
    try {
        await requireOrgRole('admin')
    } catch (e) {
        return { success: false, error: "No tienes permisos para crear usuarios" }
    }

    try {
        // 1. Create User via Admin API
        let { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto-confirm since admin is creating it manually
            user_metadata: {
                full_name: data.fullName
            }
        })

        if (createError) {
            // Check if user already exists
            if (createError.message?.includes("already been registered")) {
                console.log('[createUserManually] User exists, updating password and metadata instead.')

                // Fetch user ID by email via profiles (since they must have a profile if registered)
                // Alternatively use listUsers filtering, but profiles is indexed by email usually or we can rely on listUsers
                // Actually, let's use profiles table as it's cleaner if possible, but auth is source of truth.
                // Supabase Admin doesn't have getUserByEmail exposed easily in all client versions. 
                // Let's try profiles.

                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('email', data.email)
                    .single()

                if (!profile) {
                    return { success: false, error: "El correo estÃ¡ registrado pero no pudimos recuperar el usuario. Contacta soporte." }
                }

                // Update the existing user's password and name
                const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    profile.id,
                    {
                        password: data.password,
                        user_metadata: { full_name: data.fullName },
                        email_confirm: true // Ensure they are confirmed
                    }
                )

                if (updateError) {
                    throw updateError
                }

                // Continue flow with this user
                userData = { user: updatedUser.user }
            } else {
                throw createError
            }
        }

        const user = userData.user
        if (!user) throw new Error("Error creando usuario")

        // 2. Ensure Profile
        await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                email: data.email,
                full_name: data.fullName,
                platform_role: 'user',
                updated_at: new Date().toISOString()
            }, { onConflict: 'id', ignoreDuplicates: true })

        // 3. Add to Organization Members
        const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .insert({
                organization_id: orgId,
                user_id: user.id,
                role: 'member',
                role_id: data.role // In UI we must ensure data.role is a UUID
            })

        if (memberError) {
            // Rollback user creation? No, maybe just error out. 
            // Admin can retry invite or delete user.
            console.error('[createUserManually] Membership Error:', memberError)
            return {
                success: false,
                error: "Usuario creado en Auth pero fallÃ³ asignaciÃ³n a la organizaciÃ³n: " + memberError.message
            }
        }

        // revalidateTag('permissions')
        revalidatePath('/platform/settings')
        return { success: true, userId: user.id }

    } catch (error: any) {
        console.error("Create User Error:", error)
        return { success: false, error: error.message }
    }
}

