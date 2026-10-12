import 'server-only'
import { createClient } from '@/modules/core/database/supabase-server'
import { isSuperAdmin } from '@/modules/core/iam/services/platform-roles'
import { hasPermission } from '@/modules/core/iam/services/role-service'
import { getActiveModules } from '@/modules/core/saas/saas-actions'
import { getOrgSpaceCategory } from '@/modules/core/organizations/space-helpers'
import { knownPermissions, type HelpAccess, type HelpArticle } from './schema'
import type { PermissionString } from '@/modules/core/iam/actions/permissions'

export async function resolveHelpAccess(org: string, userId: string, articles: HelpArticle[], route?: string): Promise<HelpAccess> {
    const client = await createClient()
    const [platformAdmin, modules, vertical, membership] = await Promise.all([
        isSuperAdmin(userId), getActiveModules(org), getOrgSpaceCategory(org),
        client.from('organization_members').select('role,status').eq('organization_id', org).eq('user_id', userId).maybeSingle(),
    ])
    const activeMember = !membership.error && !!membership.data && membership.data.status !== 'blocked'
    // Hierarchical users without direct membership get only unrestricted general articles.
    const tenantAdmin = activeMember && ['owner', 'admin'].includes(membership.data?.role || '')
    const required = [...new Set(articles.flatMap(article => article.required_permissions))].filter(p => knownPermissions.includes(p))
    const permissions = platformAdmin ? required : activeMember
        ? (await Promise.all(required.map(async permission => await hasPermission(permission as PermissionString) ? permission : null))).filter((p): p is string => p !== null)
        : []
    const allowedRoutes = new Set(articles.filter(a => a.audience !== 'platform-admin' || platformAdmin).flatMap(a => a.routes))
    return { platformAdmin, tenantAdmin, modules, permissions, vertical, route: route && allowedRoutes.has(route) ? route : null }
}
