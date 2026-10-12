import type { HelpAccess, HelpArticle } from './schema'

export const HELP_SURFACES = ['dashboard', 'portal.tasks'] as const
export type HelpSurface = typeof HELP_SURFACES[number]
export const TASK_PORTAL_PROFILES = ['collaborator', 'qa', 'lead', 'support'] as const
export type TaskPortalProfile = typeof TASK_PORTAL_PROFILES[number]

/** Legacy articles/access belong to the dashboard, never implicitly to a portal. */
export function matchesHelpSurface(article: HelpArticle, access: HelpAccess): boolean {
    const surface = article.surface || 'dashboard'
    if (surface !== (access.surface || 'dashboard')) return false
    if (surface === 'portal.tasks') {
        return article.audience === 'portal-collaborator'
            && !!article.portal_profiles?.length
            && !!access.portalProfiles?.some(profile => article.portal_profiles!.includes(profile))
    }
    return article.audience !== 'portal-collaborator' && !article.portal_profiles?.length
}
