import { expect, it } from 'vitest'
import { articleSchema, type HelpAccess, type HelpArticle } from './schema'
import { retrieveHelp } from './retrieval'
import { canReadArticle } from './retrieval'
import published from './published.json'

const dashboard: HelpAccess = { platformAdmin: true, tenantAdmin: true, modules: ['all'], permissions: ['operations.tasks.view'], vertical: 'agency', route: '/dashboard' }
const portal: HelpAccess = { ...dashboard, platformAdmin: false, tenantAdmin: false, surface: 'portal.tasks', portalProfiles: ['collaborator'], permissions: [], modules: ['module_tasks'], route: '/portal/tasks/[token]' }
const base: HelpArticle = { id: 'tasks-portal.navigation', title: 'Navegar tareas portal', module: 'tasks', audience: 'portal-collaborator', surface: 'portal.tasks', routes: ['/portal/tasks/[token]'], keywords: ['tareas', 'portal'], content: 'Guía de navegación del portal de tareas. '.repeat(4), required_modules: ['module_tasks'], required_permissions: [], verticals: [], link_route: null, revision: 'a'.repeat(64), portal_profiles: ['collaborator'] }

it('keeps dashboard guides outside portal access and portal guides outside dashboard access', () => {
    expect(published.articles.every(article => articleSchema.safeParse(article).success)).toBe(true)
    expect(published.articles.filter(article => !('surface' in article) || article.surface !== 'portal.tasks').some(article => canReadArticle(article as HelpArticle, portal))).toBe(false)
    expect(published.articles.filter(article => 'surface' in article && article.surface === 'portal.tasks').some(article => canReadArticle(article as HelpArticle, dashboard))).toBe(false)
})

it('requires every technical capability even for leads and honors explicit removal', () => {
    const restricted: HelpArticle = { ...base, portal_profiles: ['lead'], required_portal_capabilities: ['vcs_code', 'finance_costs'] }
    expect(canReadArticle(restricted, { ...portal, portalProfiles: ['lead'], portalCapabilities: ['vcs_code'] })).toBe(false)
    expect(canReadArticle(restricted, { ...portal, portalProfiles: ['lead'], portalCapabilities: ['vcs_code', 'finance_costs'] })).toBe(true)
    expect(canReadArticle(restricted, { ...portal, portalProfiles: ['lead'], platformAdmin: true })).toBe(false)
})

it('does not grant a dashboard admin access to a portal guide', () => {
    expect(canReadArticle(base, dashboard)).toBe(false)
    expect(retrieveHelp([base], 'tareas portal', dashboard)).toEqual([])
    expect(retrieveHelp([base], 'tareas portal', portal)).toEqual([base])
})

it('filters portal profiles and modules before retrieval', () => {
    const lead = { ...base, portal_profiles: ['lead' as const] }
    expect(canReadArticle(lead, portal)).toBe(false)
    expect(canReadArticle(lead, { ...portal, portalProfiles: ['lead'] })).toBe(true)
    expect(canReadArticle(base, { ...portal, modules: [] })).toBe(false)
    expect(canReadArticle(base, { ...portal, portalProfiles: undefined })).toBe(false)
})

it('rejects mixed or incomplete portal metadata instead of granting general access', () => {
    for (const candidate of [
        { ...base, surface: undefined }, { ...base, portal_profiles: undefined },
        { ...base, audience: 'tenant-user' }, { ...base, routes: ['/invoices'] },
        { ...base, required_modules: [] }, { ...base, required_permissions: ['org.roles.manage'] },
        { ...base, link_route: '/portal/tasks/actual-token' },
    ]) expect(articleSchema.safeParse(candidate).success).toBe(false)
    expect(articleSchema.safeParse(base).success).toBe(true)
})
