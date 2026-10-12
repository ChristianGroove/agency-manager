import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { HelpArticle, HelpAccess } from '../library/schema'

const mocks = vi.hoisted(() => ({
    execute: vi.fn(), access: vi.fn(), articles: [] as HelpArticle[],
    org: '', user: 'user', enabled: true, threadExists: true, historyError: false,
    stored: [] as { role: 'user' | 'assistant'; content: string }[],
    inserted: [] as { table: string; value: Record<string, unknown> }[], eq: vi.fn(),
}))
vi.mock('@/modules/infrastructure/ai-engine/service', () => ({ AIEngine: { executeTask: mocks.execute } }))
vi.mock('@/modules/core/organizations/organization-actions', () => ({ getCurrentOrganizationId: async () => mocks.org }))
vi.mock('@/modules/core/organizations/space-helpers', () => ({ getOrgSpaceCategory: async () => 'agency' }))
vi.mock('../library/session', () => ({ resolveHelpAccess: mocks.access }))
vi.mock('../library/runtime', () => ({ helpV2Enabled: () => mocks.enabled, helpCorpus: { revision: 'a'.repeat(64), articles: mocks.articles } }))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: mocks.user } } }) },
    from: (table: string) => {
        const result = { error: null }
        const query = {
            select: () => query,
            eq: (key: string, value: string) => { mocks.eq(table, key, value); return query },
            order: () => query,
            limit: async () => ({ data: mocks.stored, error: mocks.historyError ? new Error('DB details') : null }),
            maybeSingle: async () => ({ data: mocks.threadExists ? { id: '11111111-1111-4111-8111-111111111111' } : null, error: null }),
            single: async () => ({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null }),
            insert: (value: Record<string, unknown>) => { mocks.inserted.push({ table, value }); return query },
            then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        }
        return query
    },
}) }))

import { askHelpAssistant } from './ask-help-assistant'

let sequence = 0
const threadId = '11111111-1111-4111-8111-111111111111'
const access: HelpAccess = { platformAdmin: false, tenantAdmin: false, modules: ['module_messaging'], permissions: [], vertical: 'agency', route: '/dashboard' }
const article = (id: string, title: string, content: string): HelpArticle => ({
    id, title, content, module: 'help', audience: 'tenant-user', routes: ['/dashboard'], keywords: title.split(' '),
    required_modules: [], required_permissions: [], verticals: [], link_route: null, revision: 'a'.repeat(64),
})
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('PIXY_HELP_DIAGNOSTICS_ENABLED', 'true')
    vi.spyOn(console, 'info').mockImplementation(() => {})
    mocks.org = `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`
    mocks.user = 'user'; mocks.enabled = true; mocks.threadExists = true; mocks.historyError = false
    mocks.stored = []; mocks.inserted = []
    mocks.articles.splice(0, mocks.articles.length,
        article('theme.toggle', 'Cambiar tema oscuro', 'Usa el botón de tema para alternar claro y oscuro.'),
        { ...article('inbox.notes', 'Nota interna inbox', 'Selecciona Nota para escribir un apunte privado en inbox.'), required_modules: ['module_messaging'] },
        { ...article('admin.roles', 'Configurar roles', 'Abre la administración de permisos.'), audience: 'platform-admin' },
    )
    mocks.access.mockResolvedValue(access)
    mocks.execute.mockImplementation(async ({ taskType }) => ({ success: true, data: taskType === 'help-select-guides-v1' ? { articleIds: [] } : '**Respuesta verificada**' }))
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

function diagnostic() {
    const calls = vi.mocked(console.info).mock.calls.filter(call => call[0] === '[PixyHelp]')
    return JSON.parse(calls.at(-1)![1])
}

describe('help conversations through the server action', () => {
    it('answers a first question and persists it without adding diagnostics to the response', async () => {
        const response = await askHelpAssistant('¿Cómo cambio el tema oscuro?')
        expect(response).toMatchObject({ success: true, message: '**Respuesta verificada**', threadId })
        expect(mocks.inserted.filter(row => row.table === 'help_chat_messages').map(row => row.value.role)).toEqual(['user', 'assistant'])
        expect(diagnostic()).toMatchObject({ outcome: 'answered', mode: 'v2', model_calls: 1, selection_used: false, article_ids: ['theme.toggle'] })
        expect(JSON.stringify(diagnostic())).not.toMatch(/Cómo|Respuesta verificada/)
    })

    it('uses persisted history for a follow-up, ignoring contradictory browser history', async () => {
        const longAnswer = 'Detalle verificado del tema. '.repeat(20)
        mocks.stored = [{ role: 'assistant', content: longAnswer }, { role: 'user', content: '¿Cómo cambio el tema oscuro?' }]
        await askHelpAssistant('¿Y en móvil?', [{ role: 'user', content: 'Configurar roles secretos' }], threadId)
        const call = mocks.execute.mock.calls[0][0]
        expect(call.taskType).toBe('help-assistant-v2')
        expect(call.payload.articles.map((item: HelpArticle) => item.id)).toEqual(['theme.toggle'])
        expect(call.payload.history).toEqual([...mocks.stored].reverse())
        expect(diagnostic()).toMatchObject({ history_source: 'database', history_messages: 2 })
        expect(mocks.eq).toHaveBeenCalledWith('help_chat_threads', 'organization_id', mocks.org)
        expect(mocks.eq).toHaveBeenCalledWith('help_chat_threads', 'user_id', mocks.user)
    })

    it('changes topics instead of reusing the previous theme guide', async () => {
        mocks.stored = [{ role: 'assistant', content: 'Pulsa el tema.' }, { role: 'user', content: 'Cambiar tema oscuro' }]
        await askHelpAssistant('¿Cómo escribo una nota interna en inbox?', [], threadId)
        expect(mocks.execute.mock.calls[0][0].payload.articles.map((item: HelpArticle) => item.id)).toEqual(['inbox.notes'])
    })

    it('handles casual chat after a product discussion without searching or asking about errors', async () => {
        mocks.stored = [{ role: 'assistant', content: 'No puedo confirmar si permite stickers.' }, { role: 'user', content: '¿Puedo cargar stickers propios?' }]
        const response = await askHelpAssistant('sabes chistes?', [], threadId)
        expect(response).toMatchObject({ success: true, message: expect.stringContaining('Pixy') })
        expect(response.message).not.toMatch(/opción|error|pantalla|documentación/)
        expect(mocks.execute).not.toHaveBeenCalled()
        expect(mocks.inserted.filter(row => row.table === 'help_chat_messages').map(row => row.value.role)).toEqual(['user', 'assistant'])
        expect(diagnostic()).toMatchObject({ mode: 'casual', model_calls: 0 })
    })

    it('persists a natural uncertain reply when the model repeats the previous source narration', async () => {
        mocks.execute.mockResolvedValue({ success: true, data: 'No puedo confirmar esa función, ya que la documentación disponible no registra esa funcionalidad.' })
        const response = await askHelpAssistant('Nota interna inbox')
        expect(response.message).toBe('No puedo confirmarlo por ahora.')
        expect(mocks.inserted.at(-1)?.value.content).toBe(response.message)
    })

    it('bounds assisted selection to authorized guides and records two model calls', async () => {
        mocks.execute.mockResolvedValueOnce({ success: true, data: { articleIds: ['admin.roles', 'inbox.notes', 'invented.guide'] } })
            .mockResolvedValueOnce({ success: true, data: 'Usa Nota.' })
        const response = await askHelpAssistant('Necesito anotar una observación confidencial')
        expect(response.success).toBe(true)
        const catalogue = mocks.execute.mock.calls[0][0].payload.catalogue
        expect(catalogue.some((item: { id: string }) => item.id === 'admin.roles')).toBe(false)
        expect(mocks.execute.mock.calls[1][0].payload.articles.map((item: HelpArticle) => item.id)).toEqual(['inbox.notes'])
        expect(diagnostic()).toMatchObject({ selection_used: true, model_calls: 2, article_ids: ['inbox.notes'] })
    })

    it('clarifies when selection has no verified guide without generating an answer', async () => {
        const response = await askHelpAssistant('Necesito ajustar una capacidad inexistente')
        expect(response.success).toBe(true)
        expect(mocks.execute).toHaveBeenCalledTimes(1)
        expect(diagnostic()).toMatchObject({ outcome: 'no_context', model_calls: 1, article_ids: [] })
    })

    it('makes no model call when the session cannot read any guide', async () => {
        mocks.articles.shift()
        mocks.access.mockResolvedValue({ ...access, modules: [] })
        const response = await askHelpAssistant('Configurar roles o nota interna')
        expect(response.success).toBe(true)
        expect(mocks.execute).not.toHaveBeenCalled()
        expect(diagnostic()).toMatchObject({ outcome: 'no_context', authorized_articles: 0, model_calls: 0 })
    })

    it('rejects malformed requests before persistence and does not log their contents', async () => {
        const response = await askHelpAssistant('privado '.repeat(100))
        expect(response.success).toBe(false)
        expect(mocks.inserted).toHaveLength(0)
        expect(mocks.execute).not.toHaveBeenCalled()
        expect(diagnostic()).toMatchObject({ outcome: 'failed', failure_stage: 'validation' })
        expect(JSON.stringify(diagnostic())).not.toContain('privado')
    })

    it('fails closed when a thread is missing or belongs to another session', async () => {
        mocks.threadExists = false
        const response = await askHelpAssistant('Cambiar tema oscuro', [], threadId)
        expect(response.success).toBe(false)
        expect(mocks.execute).not.toHaveBeenCalled()
        expect(mocks.inserted).toHaveLength(0)
        expect(diagnostic()).toMatchObject({ failure_stage: 'history', model_calls: 0 })
    })

    it('does not fall back to browser history when loading persisted history fails', async () => {
        mocks.historyError = true
        const response = await askHelpAssistant('Cambiar tema oscuro', [{ role: 'user', content: 'fallback' }], threadId)
        expect(response.success).toBe(false)
        expect(mocks.execute).not.toHaveBeenCalled()
        expect(diagnostic().failure_stage).toBe('history')
    })

    it('records generation failures without storing provider errors as assistant messages', async () => {
        mocks.execute.mockResolvedValue({ success: false, error: 'secret provider details' })
        const response = await askHelpAssistant('Cambiar tema oscuro')
        expect(response.success).toBe(false)
        expect(mocks.inserted.filter(row => row.table === 'help_chat_messages').map(row => row.value.role)).toEqual(['user'])
        expect(diagnostic()).toMatchObject({ failure_stage: 'generation', outcome: 'failed' })
        expect(JSON.stringify(diagnostic()) + JSON.stringify(response)).not.toContain('secret provider details')
    })

    it('keeps the legacy path available when the pilot is disabled', async () => {
        mocks.enabled = false
        await askHelpAssistant('Cambiar tema oscuro')
        expect(mocks.execute.mock.calls[0][0].taskType).toBe('help-assistant')
        expect(diagnostic()).toMatchObject({ mode: 'legacy', model_calls: 1 })
    })
})
