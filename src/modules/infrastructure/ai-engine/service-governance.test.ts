import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIEngine } from './service'

const mocks = vi.hoisted(() => ({ governance: vi.fn(), cached: vi.fn(), from: vi.fn(), task: vi.fn(), generate: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))
vi.mock('./cache', () => ({ getCachedResponse: mocks.cached, setCachedResponse: vi.fn() }))
vi.mock('./registry', () => ({ AIRegistry: { getProvider: () => ({ generateResponse: mocks.generate }) } }))
vi.mock('./tasks/registry', () => ({ getTaskDefinition: mocks.task }))
vi.mock('./encryption', () => ({ decrypt: vi.fn() }))

beforeEach(() => {
    mocks.from.mockReset()
    mocks.governance.mockReset()
    mocks.cached.mockReset().mockResolvedValue('Cached help')
    mocks.task.mockReset().mockReturnValue({ tier: 'cheap' })
    mocks.generate.mockReset()
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: mocks.governance }
    mocks.from.mockReturnValue(query)
})
const execute = () => AIEngine.executeTask({ organizationId: 'local-org', taskType: 'help-assistant', payload: { question: 'Ayuda' } })
describe('AI governance before cache', () => {
    it.each([
        { status: 'suspended', rate_limit_config: { ai_mode: 'saas', ai_status: 'active' } },
        { status: 'active', rate_limit_config: { ai_mode: 'disabled' } },
        { status: 'active', rate_limit_config: { ai_status: 'suspended' } },
    ])('blocks cached responses for unavailable organizations: %j', async data => {
        mocks.governance.mockResolvedValue({ data, error: null })
        await expect(execute()).rejects.toMatchObject({ name: 'AIAccessError' })
        expect(mocks.cached).not.toHaveBeenCalled()
        expect(mocks.from).toHaveBeenCalledTimes(1)
    })
    it.each([{ data: null, error: null }, { data: null, error: { message: 'private database diagnostic' } }])('fails closed when governance cannot be verified', async result => {
        mocks.governance.mockResolvedValue(result)
        await expect(execute()).rejects.toThrow('No se pudo verificar')
        expect(mocks.cached).not.toHaveBeenCalled()
    })
    it('allows an available organization to use its cached response', async () => {
        mocks.governance.mockResolvedValue({ data: { status: 'active', rate_limit_config: {} }, error: null })
        await expect(execute()).resolves.toMatchObject({ success: true, data: 'Cached help', provider: 'cache' })
        expect(mocks.governance.mock.invocationCallOrder[0]).toBeLessThan(mocks.cached.mock.invocationCallOrder[0])
    })
    it('uses a task-scoped supported model instead of the legacy tier default', async () => {
        mocks.cached.mockResolvedValue(null)
        mocks.governance.mockResolvedValue({ data: { status: 'active', rate_limit_config: { ai_mode: 'byok' } }, error: null })
        mocks.task.mockReturnValue({ tier: 'standard', modelOverrides: { google: 'supported-help-model' }, systemPrompt: () => 'Help', userPrompt: () => 'Question' })
        mocks.generate.mockResolvedValue({ content: 'Respuesta', model: 'supported-help-model' })
        const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: mocks.governance }
        mocks.from.mockImplementation(table => table === 'organizations' ? query : table === 'ai_credentials'
            ? { select: () => ({ eq: () => ({ eq: () => ({ order: async () => ({ data: [{ id: 'cred', provider_id: 'google', status: 'active', priority: 1, api_key_encrypted: 'sk-test' }] }) }) }) }) }
            : { insert: async () => ({ error: null }) })
        await expect(execute()).resolves.toMatchObject({ success: true, data: 'Respuesta' })
        expect(mocks.generate.mock.calls[0][1]).toBe('supported-help-model')
    })
})
