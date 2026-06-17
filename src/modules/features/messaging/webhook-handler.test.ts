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
    vi.doUnmock('@/modules/core/database/supabase-admin')
    vi.doUnmock('@/modules/infrastructure/meta/services/calling/call-permission-manager')
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

    it('does not expose call signaling identifiers or crypto errors in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const { callingSignalingHandler } = await import('@/modules/infrastructure/meta/services/calling/calling-signaling-handler')
        ;(callingSignalingHandler as any).processOffer = vi.fn(async () => {
            throw new Error('sdp offer secret-value for call_secret_123')
        })

        const { webhookManager } = await import('./webhook-handler')
        webhookManager.registerProvider('whatsapp', {
            name: 'calling-provider',
            sendMessage: vi.fn(),
            validateWebhook: vi.fn(),
            parseWebhook: vi.fn(async () => [{
                type: 'call_signaling',
                id: 'msg_secret_123',
                from: '+573001112233',
                timestamp: new Date(),
                call_id: 'call_secret_123',
                event: 'offer',
                payload: 'v=0 secret-value',
            }]),
        } as any)

        const result = await webhookManager.handleParsed('whatsapp', {
            object: 'whatsapp_business_account',
        })

        expect(result).toEqual({ success: true })

        const logText = [
            collectConsoleCalls(logSpy),
            collectConsoleCalls(errorSpy),
        ].join('\n')

        expect(logText).toContain('callIdPresent')
        expect(logText).not.toContain('call_secret_123')
        expect(logText).not.toContain('msg_secret_123')
        expect(logText).not.toContain('+573001112233')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('sdp offer')
    })

    it('does not expose call permission button or conversation identifiers in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        vi.doMock('@/modules/core/database/supabase-admin', () => ({
            supabaseAdmin: {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: null,
                                error: new Error('lead lookup secret-value for conv_573001112233_secret'),
                            })),
                        })),
                    })),
                })),
            },
        }))
        vi.doMock('@/modules/infrastructure/meta/services/calling/call-permission-manager', () => ({
            CallPermissionManager: vi.fn(() => ({})),
        }))

        const { inboxService } = await import('./inbox-service')
        ;(inboxService as any).handleIncomingMessage = vi.fn(async () => ({
            success: true,
            conversationId: 'conv_573001112233_secret',
        }))

        const { webhookManager } = await import('./webhook-handler')
        webhookManager.registerProvider('whatsapp', {
            name: 'button-provider',
            sendMessage: vi.fn(),
            validateWebhook: vi.fn(),
            parseWebhook: vi.fn(async () => [{
                id: 'message_secret',
                externalId: 'external_secret',
                channel: 'whatsapp',
                from: '+573001112233',
                buttonId: 'approve_call_perm_secret-button-token',
                content: {
                    type: 'text',
                    text: 'Approve',
                },
                timestamp: new Date(),
            }]),
        } as any)

        const result = await webhookManager.handleParsed('whatsapp', {
            object: 'whatsapp_business_account',
        })

        expect(result).toEqual({ success: true })

        const logText = [
            collectConsoleCalls(logSpy),
            collectConsoleCalls(warnSpy),
            collectConsoleCalls(errorSpy),
        ].join('\n')

        expect(logText).toContain('buttonIdPresent')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).not.toContain('conv_573001112233_secret')
        expect(logText).not.toContain('approve_call_perm_secret-button-token')
        expect(logText).not.toContain('+573001112233')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('lead lookup')
    })
})
