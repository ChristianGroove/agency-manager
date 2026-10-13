import { describe, expect, it } from 'vitest'
import { boundedHistory, canReadArticle, retrieveHelp, terms } from './retrieval'
import { corpusSchema, draftSchema, reviewSchema, type HelpAccess, type HelpArticle } from './schema'

const article: HelpArticle = {
    id: 'dashboard.theme', title: 'Cambiar el tema', module: 'dashboard', audience: 'tenant-user',
    routes: ['/dashboard'], keywords: ['tema', 'oscuro'], content: 'Usa el botón de tema del sidebar para alternar entre claro y oscuro.',
    required_modules: [], required_permissions: [], verticals: [], link_route: '/dashboard', revision: 'a'.repeat(64),
}
const access: HelpAccess = { platformAdmin: false, tenantAdmin: false, modules: ['core_settings'], permissions: [], vertical: 'agency', route: '/dashboard' }

describe('published help authorization and lexical retrieval', () => {
    it('normalizes Spanish accents without losing keywords', () => expect(terms('¿Cómo envío una cotización?')).toEqual(['envio', 'cotizacion']))
    it('filters permission, audience, module and vertical before ranking', () => {
        const restricted = [
            { ...article, id: 'admin.only', audience: 'platform-admin' as const },
            { ...article, id: 'tenant.admin', audience: 'tenant-admin' as const },
            { ...article, id: 'module.only', required_modules: ['module_messaging'] },
            { ...article, id: 'permission.only', required_permissions: ['org.settings.manage'] },
            { ...article, id: 'vertical.only', verticals: ['resto'] },
        ]
        expect(retrieveHelp([article, ...restricted], 'tema oscuro', access).map(a => a.id)).toEqual([article.id])
        expect(canReadArticle(restricted[3], { ...access, tenantAdmin: true })).toBe(false)
    })
    it('does not treat screen location as evidence for an unrelated question', () => expect(retrieveHelp([article], 'configurar impuestos', access)).toEqual([]))
    it('finds a guide from two anchored concepts inside a longer natural-language question', () => {
        expect(retrieveHelp([article], 'Quisiera entender exactamente por dónde seleccionar el tema oscuro después de entrar', access)).toEqual([article])
    })
    it('rejects an unrelated question that mentions only one familiar topic', () => {
        expect(retrieveHelp([article], 'tema de impuestos y tasas tributarias', access)).toEqual([])
    })
    it('uses prior question for short follow-ups', () => {
        expect(retrieveHelp([article], '¿Y en móvil?', access, '¿Cómo cambio el tema?').map(a => a.id)).toEqual([article.id])
    })
    it('caps context size without truncating a retrieved procedure', () => {
        const large = Array.from({ length: 5 }, (_, index) => ({ ...article, id: `article.${index}`, content: 'tema '.repeat(1800) }))
        expect(retrieveHelp(large, 'tema', access)).toHaveLength(1)
    })
    it('preserves full recent messages within budget', () => {
        const messages = [{ role: 'user' as const, content: 'a'.repeat(300) }, { role: 'assistant' as const, content: 'b'.repeat(600) }]
        expect(boundedHistory(messages)).toEqual(messages)
        expect(boundedHistory(messages, 700)).toEqual([])
    })
    it('rejects a draft-shaped object as a published corpus article', () => expect(corpusSchema.safeParse({ schema_version: 1, revision: 'draft', articles: [{ ...article, status: 'draft' }] }).success).toBe(false))
    it('requires evidence and rejects unknown permission names in approvals', () => {
        expect(draftSchema.safeParse({ id: 'dashboard.theme', status: 'draft' }).success).toBe(false)
        const review = { schema_version: 1, articles: [{ id: article.id, draft_sha256: article.revision, reviewed_by: 'Reviewer', reviewed_on: '2026-10-12', evidence_sha256: {}, required_modules: [], required_permissions: ['invented.permission'], verticals: [], link_route: null }] }
        expect(reviewSchema.safeParse(review).success).toBe(false)
        expect(reviewSchema.safeParse({ ...review, articles: [{ ...review.articles[0], required_permissions: ['org.settings.manage'], required_modules: ['core_settings'] }] }).success).toBe(true)
    })
})
