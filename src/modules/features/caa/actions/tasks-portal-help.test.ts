import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { HelpArticle } from '../library/schema'
const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), execute: vi.fn(), read: vi.fn(), articles: [] as HelpArticle[] }))
vi.mock('../library/tasks-portal-session', () => ({ resolveTasksPortalHelpSession: mocks.session }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
vi.mock('@/modules/infrastructure/ai-engine/service', () => ({ AIEngine: { executeTask: mocks.execute } }))
vi.mock('../library/runtime', () => ({ helpCorpus: { revision: 'a'.repeat(64), articles: mocks.articles } }))
vi.mock('../library/portal-history', async importOriginal => ({ ...await importOriginal<object>(), readPortalHelpMessages: mocks.read }))
import { askTasksPortalHelp } from './tasks-portal-help'

const tenantId = '00000000-0000-4000-8000-000000000001'
const staffId = '00000000-0000-4000-8000-000000000002'
const threadId = '00000000-0000-4000-8000-000000000003'
const token = 'private_portal_token_abcdef1234'
const requestId = '00000000-0000-4000-8000-000000000004'
const session = { tenantId, staffId, capabilities: { portalMode: 'operations' }, access: { surface: 'portal.tasks', portalProfiles: ['collaborator'], portalCapabilities: [], modules: ['module_tasks'], permissions: [], platformAdmin: false, tenantAdmin: false, vertical: 'agency', route: '/portal/tasks/[token]' } }
const article: HelpArticle = { id: 'tasks-portal.comments-and-mentions', title: 'Comentarios y menciones', content: 'Escribe comentarios en la tarea y menciona compañeros.', module: 'tasks', audience: 'portal-collaborator', surface: 'portal.tasks', portal_profiles: ['collaborator'], routes: ['/portal/tasks/[token]'], keywords: ['comentarios', 'menciones'], required_modules: ['module_tasks'], required_permissions: [], verticals: [], link_route: null, revision: 'a'.repeat(64) }
const input = { token, requestId, question: '¿Cómo escribo comentarios en la tarea?' }
beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('PIXY_HELP_DIAGNOSTICS_ENABLED', 'false')
    mocks.articles.splice(0, mocks.articles.length, article, { ...article, id: 'dashboard.secret', surface: 'dashboard', audience: 'tenant-user', portal_profiles: undefined })
    mocks.session.mockResolvedValue(session)
    mocks.rpc.mockImplementation(async name => ({ error: null, data: name === 'begin_portal_help_turn' ? { status: 'reserved', thread_id: threadId } : true }))
    mocks.read.mockResolvedValue([{ role: 'user', content: input.question }])
    mocks.execute.mockImplementation(async ({ taskType }) => ({ success: true, data: taskType === 'help-select-guides-v1' ? { articleIds: [] } : '**Escribe tu comentario.**' }))
})
afterEach(() => vi.unstubAllEnvs())

it('persists through server RPCs, scopes the generation and excludes portal credentials', async () => {
    const result = await askTasksPortalHelp({ ...input, question: `${input.question} ${token}` })
    expect(result).toMatchObject({ success: true, threadId, message: '**Escribe tu comentario.**' })
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_org: tenantId, p_staff: staffId, p_request: requestId, p_question: expect.stringContaining('[enlace privado]') })
    const payload = mocks.execute.mock.calls[0][0].payload
    expect(payload.session).toMatchObject({ surface: 'portal.tasks', route: '/portal/tasks/[token]' })
    expect(payload.articles.map((a: HelpArticle) => a.id)).toEqual([article.id])
    expect(JSON.stringify(payload)).not.toMatch(new RegExp(`${token}|${staffId}`))
    expect(mocks.rpc.mock.calls.at(-1)?.[1]).toMatchObject({ p_answer: result.message, p_articles: [article.id] })
})
it.each([{ ...input, tenantId }, { ...input, surface: 'dashboard' }, { ...input, history: [] }, { ...input, question: 'x' }])('rejects browser scope/history injection before any access', async value => {
    expect((await askTasksPortalHelp(value)).success).toBe(false)
    expect(mocks.session).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled()
})
it('fails closed on a locked or revoked portal', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await askTasksPortalHelp(input)).success).toBe(false)
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.execute).not.toHaveBeenCalled()
})
it.each(['rate_limited', 'busy', 'invalid_thread', 'full'])('makes no model call for rejected reservations: %s', async status => {
    mocks.rpc.mockResolvedValue({ data: { status }, error: null })
    expect((await askTasksPortalHelp(input)).success).toBe(false)
    expect(mocks.execute).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled()
})
it('returns the persisted answer on duplicate delivery without charging another model call', async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: { status: 'duplicate', thread_id: threadId, message: 'Respuesta guardada.', article_ids: [article.id] } })
    expect(await askTasksPortalHelp(input)).toMatchObject({ success: true, message: 'Respuesta guardada.' })
    expect(mocks.execute).not.toHaveBeenCalled()
})
it('hides duplicate responses associated with a capability that has been removed', async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: { status: 'duplicate', thread_id: threadId, message: 'Privado.', article_ids: ['tasks-portal.hidden'] } })
    expect((await askTasksPortalHelp(input)).message).not.toContain('Privado.')
})
it('uses stored prior history and removes hidden guide content from model context', async () => {
    mocks.read.mockResolvedValue([{ role: 'user', content: 'Comentarios' }, { role: 'assistant', content: 'Acción secreta', article_ids: ['tasks-portal.hidden'] }, { role: 'user', content: '¿Y en móvil?' }])
    await askTasksPortalHelp({ ...input, question: '¿Y en móvil?', threadId })
    expect(JSON.stringify(mocks.execute.mock.calls[0][0].payload.history)).not.toContain('Acción secreta')
    expect(mocks.execute.mock.calls[0][0].payload.history).toHaveLength(2)
})
it('redirects explicit dashboard topics and handles casual chat without a provider', async () => {
    expect((await askTasksPortalHelp({ ...input, question: 'Cómo configuro facturas en CRM' })).message).toContain('dashboard')
    expect((await askTasksPortalHelp({ ...input, question: 'sabes chistes?' })).success).toBe(true)
    expect((await askTasksPortalHelp({ ...input, question: 'Cuéntame un chiste de programadores.' })).message).not.toMatch(/opción|estado ves/)
    expect(mocks.execute).not.toHaveBeenCalled()
})

it.each(['nada mas, gracias', 'perfecto, gracias', 'hola'])('stores a social reply without guide selection or a provider call: %s', async question => {
    const response = await askTasksPortalHelp({ ...input, question })
    expect(response.success).toBe(true)
    expect(response.message).not.toMatch(/confirm|opción|estado ves/)
    expect(mocks.execute).not.toHaveBeenCalled()
    expect(mocks.rpc.mock.calls.at(-1)?.[1]).toMatchObject({ p_answer: response.message, p_articles: [] })
})

it('retrieves the previous verified topic for a recommendation after a courtesy turn', async () => {
    mocks.read.mockResolvedValue([{ role: 'user', content: input.question }, { role: 'assistant', content: 'Escribe comentarios.', article_ids: [article.id] },
        { role: 'user', content: 'excelente' }, { role: 'assistant', content: 'Perfecto.' }, { role: 'user', content: 'ah excelente, alguna recomendacion?' }])
    const response = await askTasksPortalHelp({ ...input, question: 'ah excelente, alguna recomendacion?', threadId })
    expect(response.success).toBe(true)
    expect(mocks.execute).toHaveBeenCalledTimes(1)
    expect(mocks.execute.mock.calls[0][0]).toMatchObject({ taskType: 'help-tasks-portal-v1', payload: { question: 'ah excelente, alguna recomendacion?', recommendationTopic: input.question, articles: [article] } })
})

it('asks for the recommendation topic without a provider when there is no substantive history', async () => {
    const result = await askTasksPortalHelp({ ...input, question: 'alguna recomendacion?' })
    expect(result.message).toBe('¿Sobre qué función de Tasks quieres una recomendación?')
    expect(mocks.execute).not.toHaveBeenCalled()
})

it('keeps the last topic outside Tasks out of the recommendation context', async () => {
    mocks.read.mockResolvedValue([{ role: 'user', content: 'Cómo creo una factura?' }, { role: 'assistant', content: 'Usa la ayuda del dashboard.' }, { role: 'user', content: 'alguna recomendacion?' }])
    expect((await askTasksPortalHelp({ ...input, question: 'alguna recomendacion?' })).message).toContain('dashboard')
    expect(mocks.execute).not.toHaveBeenCalled()
})

it('does not expose a guide after capabilities are revoked even through a recommendation', async () => {
    mocks.articles.splice(0, mocks.articles.length, { ...article, required_portal_capabilities: ['finance_costs'] })
    expect((await askTasksPortalHelp({ ...input, question: 'alguna recomendacion?' })).success).toBe(false)
    expect(mocks.execute).not.toHaveBeenCalled()
})
it('assisted selection sees only portal guides and rejects invented or dashboard IDs', async () => {
    mocks.execute.mockResolvedValueOnce({ success: true, data: { articleIds: ['dashboard.secret', 'invented.id', article.id] } }).mockResolvedValueOnce({ success: true, data: 'Usa comentarios.' })
    await askTasksPortalHelp({ ...input, question: 'Necesito compartir una observación confidencial' })
    expect(mocks.execute.mock.calls[0][0].payload.catalogue.map((a: HelpArticle) => a.id)).toEqual([article.id])
    expect(mocks.execute.mock.calls[1][0].payload.articles.map((a: HelpArticle) => a.id)).toEqual([article.id])
})
it('rechecks access after generation and releases the reservation when revoked', async () => {
    mocks.session.mockResolvedValueOnce(session).mockResolvedValueOnce(null)
    expect((await askTasksPortalHelp(input)).success).toBe(false)
    expect(mocks.rpc.mock.calls.at(-1)?.[1].p_answer).toBeNull()
})
it('does not persist provider failures as answers and releases the reservation', async () => {
    mocks.execute.mockResolvedValue({ success: false, error: 'private provider error' })
    const response = await askTasksPortalHelp(input)
    expect(response).toMatchObject({ success: false, threadId })
    expect(JSON.stringify(response)).not.toContain('private provider error')
    expect(mocks.rpc.mock.calls.at(-1)?.[1].p_answer).toBeNull()
})
