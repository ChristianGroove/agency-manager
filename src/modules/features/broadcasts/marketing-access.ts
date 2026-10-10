import 'server-only'
import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { evaluateInboxPermissions } from '@/modules/core/iam/utils/inbox-permissions'

export type MarketingPermission = 'view' | 'manage' | 'execute' | 'import' | 'export'

export function allowsMarketing(member: any, role: any, permission: MarketingPermission): boolean {
    if (!member || member.status === 'blocked' || member.deleted_at) return false
    const overrides = member.permissions || {}
    const permissions = role?.permissions || {}
    const key = `marketing.campaigns.${permission}`
    // Explicit denials take precedence, including for administrators.
    if (overrides[key] === false) return false
    if (overrides[key] === true) return true
    if (permissions[key] === false) return false
    return member.role === 'owner' || role?.hierarchy_level === 100 ||
        member.role === 'admin' || permissions.all === true || overrides.all === true || permissions[key] === true
}

/** Session authorization precedes every privileged Marketing operation. */
export async function requireMarketingAccess(permission: MarketingPermission = 'view') {
    const session = await createClient()
    const { data: { user }, error: userError } = await session.auth.getUser()
    if (userError || !user) throw new Error('Inicia sesión para acceder a Marketing.')
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) throw new Error('Selecciona una organización.')
    const { data: member, error } = await session.from('organization_members')
        .select('role,role_id,permissions,status,deleted_at')
        .eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle()
    if (error || !member || member.status === 'blocked' || member.deleted_at) throw new Error('No tienes acceso a esta organización.')
    let role: any = null
    if (member.role_id) {
        const result = await session.from('organization_roles').select('permissions,hierarchy_level')
            .eq('id', member.role_id).eq('organization_id', organizationId).maybeSingle()
        if (result.error) throw new Error('No se pudieron verificar tus permisos.')
        role = result.data
    }
    if (!allowsMarketing(member, role, permission)) throw new Error('No tienes permiso para esta operación de Marketing.')
    const inbox = evaluateInboxPermissions({ role: member.role, hierarchy: role?.hierarchy_level,
        permissions: { ...role?.permissions, ...member.permissions } })
    return { organizationId, userId: user.id, session, inbox }
}

export function assertMarketingChannelAccess(access: Awaited<ReturnType<typeof requireMarketingAccess>>, connectionId: string) {
    if (!access.inbox.hasGlobalView && !access.inbox.authorizedChannels.includes(connectionId)) {
        throw new Error('No tienes autorización para usar este canal.')
    }
}
