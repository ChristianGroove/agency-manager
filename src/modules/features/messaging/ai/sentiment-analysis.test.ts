import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
}))

vi.mock('openai', () => ({
    default: vi.fn(),
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

describe('sentiment analysis AI actions', () => {
    it('analyzes sentiment through the AI engine', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockResolvedValue({
            data: {
                sentiment: 'urgent',
                score: -0.9,
                emotions: ['angry'],
                urgentKeywords: ['urgent'],
                needsEscalation: true,
            },
        })

        const { analyzeSentiment } = await import('./sentiment-analysis')
        const result = await analyzeSentiment('This is urgent')

        expect(result).toEqual({
            success: true,
            result: expect.objectContaining({
                sentiment: 'urgent',
                needsEscalation: true,
            }),
        })
        expect(mocks.executeTask).toHaveBeenCalledWith({
            organizationId: 'org-current',
            taskType: 'inbox.sentiment_v1',
            payload: { message: 'This is urgent' },
        })
    })

    it('does not expose AI sentiment failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(
            Object.assign(new Error('openai api key secret-value failed for customer@example.com'), {
                statusCode: 500,
            })
        )

        const { analyzeSentiment } = await import('./sentiment-analysis')
        const result = await analyzeSentiment('Cliente molesto con su factura')

        expect(result).toEqual({
            success: false,
            error: 'Sentiment analysis failed',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('api key')
    })

    it('does not expose escalated conversation ids in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        
        const eqQuery: any = {}
        eqQuery.eq = vi.fn(() => eqQuery)
        eqQuery.then = (resolve: (value: unknown) => unknown) => resolve({ error: null })
        const eq = eqQuery.eq
        const update = vi.fn(() => eqQuery)
        const from = vi.fn(() => ({ update }))
        const rpc = vi.fn(() => ({ sql: 'array_append' }))
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue({ from, rpc })

        const { autoEscalateIfNeeded } = await import('./sentiment-analysis')
        await autoEscalateIfNeeded('conv-secret-id', {
            sentiment: 'urgent',
            score: -0.9,
            emotions: ['angry'],
            urgentKeywords: ['urgent'],
            needsEscalation: true,
        })

        expect(from).toHaveBeenCalledWith('conversations')
        expect(eq).toHaveBeenCalledWith('id', 'conv-secret-id')

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('conv-secret-id')
        expect(logText).toContain('conversationIdPresent')
    })
})
