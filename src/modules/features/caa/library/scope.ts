import type { HelpAccess, HelpArticle } from './schema'

export const HELP_SURFACES = ['dashboard', 'portal.tasks'] as const
export type HelpSurface = typeof HELP_SURFACES[number]
export const TASK_PORTAL_PROFILES = ['collaborator', 'qa', 'lead', 'support'] as const
export type TaskPortalProfile = typeof TASK_PORTAL_PROFILES[number]
export const TASK_PORTAL_CAPABILITIES = ['bulk_delete', 'vcs_code', 'design_preview', 'monitoring', 'finance_costs'] as const
export type TaskPortalCapability = typeof TASK_PORTAL_CAPABILITIES[number]

/** Legacy articles/access belong to the dashboard, never implicitly to a portal. */
export function matchesHelpSurface(article: HelpArticle, access: HelpAccess): boolean {
    const surface = article.surface || 'dashboard'
    if (surface !== (access.surface || 'dashboard')) return false
    if (surface === 'portal.tasks') {
        return article.audience === 'portal-collaborator'
            && !!article.portal_profiles?.length
            && !!access.portalProfiles?.some(profile => article.portal_profiles!.includes(profile))
            && (article.required_portal_capabilities || []).every(capability => access.portalCapabilities?.includes(capability))
    }
    return article.audience !== 'portal-collaborator' && !article.portal_profiles?.length
}
