import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    appendFileSync: vi.fn(),
    fetch: vi.fn(),
}))

vi.mock('fs', () => ({
    appendFileSync: mocks.appendFileSync,
    default: { appendFileSync: mocks.appendFileSync },
}))

function setupProductionEnv() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubGlobal('fetch', mocks.fetch)
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

async function createProvider(config: {
    baseUrl?: string
    apiKey?: string
    instanceName?: string
} = {}) {
    const { EvolutionProvider } = await import('./evolution-provider')
    return new EvolutionProvider({
        baseUrl: config.baseUrl || 'https://evolution.test',
        apiKey: config.apiKey || 'placeholder',
        instanceName: config.instanceName || 'agency-main',
    })
}

describe('EvolutionProvider', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.appendFileSync.mockReset()
        mocks.fetch.mockReset()
    })

    it('fails closed for deployed webhook validation without a shared secret or real API key', async () => {
        setupProductionEnv()
        const provider = await createProvider()

        const result = await provider.validateWebhook(new Request('https://pixy.test/api/webhooks/whatsapp'))

        expect(result).toEqual({
            isValid: false,
            reason: 'Evolution webhook secret is not configured',
        })
    })

    it('accepts deployed Evolution webhooks with the configured shared secret', async () => {
        setupProductionEnv()
        vi.stubEnv('EVOLUTION_WEBHOOK_SECRET', 'webhook-secret')
        const provider = await createProvider()

        const result = await provider.validateWebhook(new Request('https://pixy.test/api/webhooks/whatsapp', {
            headers: { 'x-evolution-webhook-secret': 'webhook-secret' },
        }))

        expect(result).toEqual({ isValid: true })
    })

    it('does not expose Evolution send failure details or write debug request logs in production', async () => {
        setupProductionEnv()
        vi.stubEnv('EVOLUTION_DEBUG_LOGS', 'true')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
            error: 'api key secret-value denied outbound message',
            detail: 'message body secret-value rejected',
        }), { status: 401 }))
        const provider = await createProvider({ apiKey: 'api-key-secret-value' })

        const result = await provider.sendMessage({
            to: '+57 300 111 2233',
            content: { type: 'text', text: 'hello secret-value' },
        })

        expect(result).toEqual({
            success: false,
            error: 'Evolution API request failed',
        })
        expect(mocks.appendFileSync).not.toHaveBeenCalled()

        const errorText = collectConsoleCalls(errorSpy)
        expect(errorText).not.toContain('secret-value')
        expect(errorText).not.toContain('api key')
        expect(errorText).not.toContain('message body')
    })
})
