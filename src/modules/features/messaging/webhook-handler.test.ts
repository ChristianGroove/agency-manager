import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(),
}))

vi.mock('./inbox-service', () => ({
    inboxService: {},
}))

vi.mock('@/modules/infrastructure/meta/services/calling/calling-signaling-handler', () => ({
    callingSignalingHandler: {},
}))

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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
})

describe('WebhookManager', () => {
    it('does not expose provider parsing failures in production messages or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { webhookManager } = await import('./webhook-handler')
        webhookManager.registerProvider('whatsapp', {
            name: 'throwing-provider',
            sendMessage: vi.fn(),
            validateWebhook: vi.fn(),
            parseWebhook: vi.fn(async () => {
                throw new Error('db password secret-value failed while parsing webhook')
            }),
        })

        const result = await webhookManager.handleParsed('whatsapp', {
            object: 'whatsapp_business_account',
            entry: [],
        })

        expect(result).toEqual({
            success: false,
            message: 'Internal processing error',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('db password')
    })
})
