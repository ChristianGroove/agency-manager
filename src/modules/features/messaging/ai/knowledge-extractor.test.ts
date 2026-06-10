import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
}))

vi.mock('@/modules/infrastructure/ai-engine/service', () => ({
    AIEngine: {
        executeTask: mocks.executeTask,
    },
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
        .map(call => call.map(value => {
            if (typeof value === 'string') return value
            if (value instanceof Error) return `${value.name}: ${value.message}`
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.executeTask.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.createClient.mockReset()
})

describe('knowledge extractor AI actions', () => {
    it('extracts FAQ entries through the AI engine', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockResolvedValue({
            data: {
                question: 'Como pago?',
                answer: 'Puedes pagar desde el portal.',
                category: 'billing',
            },
        })

        const { extractFAQ } = await import('./knowledge-extractor')
        const result = await extractFAQ('El cliente pregunto como pagar')

        expect(result).toEqual({
            success: true,
            faq: {
                question: 'Como pago?',
                answer: 'Puedes pagar desde el portal.',
                category: 'billing',
            },
        })
        expect(mocks.executeTask).toHaveBeenCalledWith({
            organizationId: 'org-current',
            taskType: 'knowledge.extract_faq_v1',
            payload: { conversation: 'El cliente pregunto como pagar' },
        })
    })

    it('does not expose FAQ extraction failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(
            Object.assign(new Error('llm provider token secret-value failed for customer@example.com'), {
                statusCode: 500,
            })
        )

        const { extractFAQ } = await import('./knowledge-extractor')
        const result = await extractFAQ('Pregunta frecuente sensible')

        expect(result).toEqual({
            success: false,
            error: 'FAQ extraction failed',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('provider token')
    })

    it('does not expose FAQ save failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const single = vi.fn(async () => ({
            data: null,
            error: {
                message: 'database password secret-value failed saving faq-secret-id',
                code: '42501',
            },
        }))
        const select = vi.fn(() => ({ single }))
        const insert = vi.fn(() => ({ select }))
        const from = vi.fn(() => ({ insert }))
        mocks.createClient.mockResolvedValue({ from })

        const { saveFAQ } = await import('./knowledge-extractor')
        const result = await saveFAQ({
            question: 'Pregunta secreta',
            answer: 'Respuesta secreta',
            category: 'billing',
        })

        expect(result).toEqual({
            success: false,
            error: 'FAQ save failed',
        })
        expect(from).toHaveBeenCalledWith('knowledge_base')

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('faq-secret-id')
        expect(logText).not.toContain('database password')
    })
})
