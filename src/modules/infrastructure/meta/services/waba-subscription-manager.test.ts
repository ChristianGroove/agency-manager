import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
}))

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
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

function setupProductionEnv() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubGlobal('fetch', mocks.fetch)
}

describe('WABASubscriptionManager', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.fetch.mockReset()
    })

    it('does not expose Meta subscription failure details in production results or logs', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
            error: {
                message: 'meta token secret-value failed subscribed_apps',
                error_user_msg: 'meta token secret-value user visible',
                type: 'OAuthException',
                code: 190,
                fbtrace_id: 'trace_123',
            },
        }), { status: 400 }))

        const { WABASubscriptionManager } = await import('./waba-subscription-manager')
        const result = await new WABASubscriptionManager().subscribeWABA('waba_123', 'access-token-secret-value')
        const responseText = JSON.stringify(result)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Ha ocurrido un error al comunicarse con WhatsApp')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const logText = [
            collectConsoleCalls(errorSpy),
            collectConsoleCalls(warnSpy),
        ].join('\n')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('meta token')
    })

    it('does not expose subscription exceptions in production results or logs', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch.mockRejectedValue(new Error('meta token secret-value failed network request'))

        const { WABASubscriptionManager } = await import('./waba-subscription-manager')
        const result = await new WABASubscriptionManager().subscribeWABA('waba_123', 'access-token-secret-value')
        const responseText = JSON.stringify(result)

        expect(result.success).toBe(false)
        expect(result.error).toBe('WABA subscription failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })

    it('does not log raw verification response bodies in production', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response('meta token secret-value verification failed', { status: 403 }))

        const { WABASubscriptionManager } = await import('./waba-subscription-manager')
        const subscribed = await new WABASubscriptionManager().verifySubscription('waba_123', 'access-token-secret-value')

        expect(subscribed).toBe(false)
        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })

    it('does not expose WABA identifiers in production success logs', async () => {
        setupProductionEnv()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'app_123' }] }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

        const { WABASubscriptionManager } = await import('./waba-subscription-manager')
        const manager = new WABASubscriptionManager()
        const wabaId = 'waba_sensitive_123'

        const subscribeResult = await manager.subscribeWABA(wabaId, 'access-token-secret-value')
        const subscribed = await manager.verifySubscription(wabaId, 'access-token-secret-value')
        const unsubscribeResult = await manager.unsubscribeWABA(wabaId, 'access-token-secret-value')

        expect(subscribeResult.success).toBe(true)
        expect(subscribed).toBe(true)
        expect(unsubscribeResult.success).toBe(true)

        const logText = collectConsoleCalls(logSpy)
        expect(logText).toContain('wabaIdPresent')
        expect(logText).not.toContain(wabaId)
        expect(logText).not.toContain('access-token-secret-value')
    })

    it('keeps subscribing WABA successfully with the expected Meta payload', async () => {
        setupProductionEnv()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

        const { WABASubscriptionManager } = await import('./waba-subscription-manager')
        const result = await new WABASubscriptionManager().subscribeWABA('waba_123', 'access-token')

        expect(result.success).toBe(true)
        expect(result.wabaId).toBe('waba_123')
        expect(mocks.fetch).toHaveBeenCalledWith(
            'https://graph.facebook.com/v24.0/waba_123/subscribed_apps',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    Authorization: 'Bearer access-token',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscribed_fields: ['messages', 'calls', 'automatic_events', 'smb_message_echoes'],
                }),
            })
        )
    })
})
