import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    resolveAssistantContext: vi.fn(),
    proposeIntent: vi.fn(),
    confirmIntent: vi.fn(),
    cancelIntent: vi.fn(),
}))

vi.mock('@/modules/assistant/context-resolver', () => ({
    resolveAssistantContext: mocks.resolveAssistantContext,
}))

vi.mock('@/modules/assistant/intent-service', () => ({
    IntentService: {
        proposeIntent: mocks.proposeIntent,
    },
}))

vi.mock('@/modules/assistant/intent-executor', () => ({
    IntentExecutor: {
        confirm: mocks.confirmIntent,
        cancel: mocks.cancelIntent,
    },
}))

function setupProductionRuntime() {
    vi.stubEnv('VERCEL_ENV', 'production')
}

function setupAssistantContext() {
    mocks.resolveAssistantContext.mockResolvedValue({
        context: {
            userId: 'user-1',
            organizationId: 'org-1',
        },
        supabase: {},
    })
}

function intentRequest(body: Record<string, unknown> = {}) {
    return new Request('https://pixy.test/api/internal/assistant/intent', {
        method: 'POST',
        body: JSON.stringify({
            intent_id: 'create_brief',
            payload: {},
            ...body,
        }),
    }) as any
}

function intentParams(logId = 'log-1') {
    return {
        params: Promise.resolve({ log_id: logId }),
    }
}

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
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

describe('/api/internal/assistant/intent', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.resolveAssistantContext.mockReset()
        mocks.proposeIntent.mockReset()
        mocks.confirmIntent.mockReset()
        mocks.cancelIntent.mockReset()
    })

    it('does not expose proposal exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        setupAssistantContext()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.proposeIntent.mockRejectedValue(
            new Error('assistant database password secret-value failed while proposing intent')
        )

        const { POST } = await import('./route')
        const response = await POST(intentRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal Governance Error')
        expect(responseText).not.toContain('details')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('does not expose confirmation exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        setupAssistantContext()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.confirmIntent.mockRejectedValue(
            new Error('assistant provider token secret-value failed while executing intent')
        )

        const { POST } = await import('./[log_id]/confirm/route')
        const response = await POST(intentRequest(), intentParams())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Execution Failed')
        expect(responseText).not.toContain('details')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('provider token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('provider token')
    })

    it('does not expose cancellation exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        setupAssistantContext()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.cancelIntent.mockRejectedValue(
            new Error('assistant audit token secret-value failed while cancelling intent')
        )

        const { POST } = await import('./[log_id]/cancel/route')
        const response = await POST(intentRequest(), intentParams())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Cancellation Failed')
        expect(responseText).not.toContain('details')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('audit token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('audit token')
    })
})
