import { afterEach, describe, expect, it, vi } from 'vitest'

function internalRequest(url: string, init: RequestInit = {}) {
    return new Request(url, {
        ...init,
        headers: {
            ...(init.headers || {}),
            'x-internal-api-secret': 'internal-secret',
        },
    })
}

function setupMetaAdminEnv() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('INTERNAL_API_SECRET', 'internal-secret')
    vi.stubEnv('META_PERMANENT_ACCESS_TOKEN', 'meta-token')
    vi.stubEnv('WHATSAPP_BUSINESS_ACCOUNT_ID', 'waba_123')
}

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
            if (typeof value === 'string') return value
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

describe('Meta admin routes', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/infrastructure/meta/services/connector')
    })

    it('does not expose internal failures when reading Meta flows', async () => {
        setupMetaAdminEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/connector', () => ({
            MetaConnector: class {
                getFlows = vi.fn(async () => {
                    throw new Error('meta token secret-value failed while reading flows')
                })
            },
        }))

        const { GET } = await import('./flows/route')
        const response = await GET(internalRequest('https://pixy.test/api/meta/flows'))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Failed to fetch flows')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })

    it('does not expose internal failures when publishing Meta flows', async () => {
        setupMetaAdminEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/connector', () => ({
            MetaConnector: class {
                publishFlow = vi.fn(async () => {
                    throw new Error('meta token secret-value failed while publishing flow')
                })
            },
        }))

        const { POST } = await import('./flows/route')
        const response = await POST(internalRequest('https://pixy.test/api/meta/flows', {
            method: 'POST',
            body: JSON.stringify({ flowId: 'flow_123', action: 'publish' }),
        }))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Failed to publish flow')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })

    it('does not expose internal failures when subscribing Meta webhooks', async () => {
        setupMetaAdminEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/connector', () => ({
            MetaConnector: class {
                subscribeToWebhooks = vi.fn(async () => {
                    throw new Error('meta token secret-value failed while subscribing webhooks')
                })
            },
        }))

        const { POST } = await import('./webhook/subscribe/route')
        const response = await POST(internalRequest('https://pixy.test/api/meta/webhook/subscribe', {
            method: 'POST',
        }))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Failed to subscribe to webhooks')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })
})
