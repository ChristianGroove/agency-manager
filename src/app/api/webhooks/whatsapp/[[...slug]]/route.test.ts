import { afterEach, describe, expect, it, vi } from 'vitest'

function evolutionRequest(body: unknown) {
    return new Request('https://pixy.test/api/webhooks/whatsapp/messages-upsert', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-evolution-webhook-secret': 'webhook-secret',
        },
        body: JSON.stringify(body),
    }) as any
}

const routeParams = { params: Promise.resolve({ slug: ['messages-upsert'] }) }

describe('/api/webhooks/whatsapp Evolution webhook', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/core/database/supabase-admin')
        vi.doUnmock('@/modules/infrastructure/automation/inngest/client')
    })

    function enableEvolutionWebhook() {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('ENABLE_EVOLUTION_WEBHOOKS', 'true')
        vi.stubEnv('EVOLUTION_WEBHOOK_SECRET', 'webhook-secret')
    }

    it('does not expose internal failures to webhook callers', async () => {
        enableEvolutionWebhook()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/core/database/supabase-admin', () => ({
            supabaseAdmin: {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        contains: vi.fn(() => ({
                            single: vi.fn(async () => {
                                throw new Error('database password secret-value failed to read channel')
                            }),
                        })),
                    })),
                })),
            },
        }))
        vi.doMock('@/modules/infrastructure/automation/inngest/client', () => ({
            inngest: { send: vi.fn() },
        }))

        const { POST } = await import('./route')
        const response = await POST(evolutionRequest({
            event: 'MESSAGES_UPSERT',
            instance: 'agency-main',
            data: [],
        }), routeParams)
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal Server Error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = errorSpy.mock.calls
            .map(call => call.map(value => {
                if (typeof value === 'string') return value
                try {
                    return JSON.stringify(value)
                } catch {
                    return String(value)
                }
            }).join(' '))
            .join('\n')
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('keeps accepting valid authorized Evolution webhooks with no instance', async () => {
        enableEvolutionWebhook()
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.doMock('@/modules/core/database/supabase-admin', () => ({
            supabaseAdmin: { from: vi.fn() },
        }))
        vi.doMock('@/modules/infrastructure/automation/inngest/client', () => ({
            inngest: { send: vi.fn() },
        }))

        const { POST } = await import('./route')
        const response = await POST(evolutionRequest({
            event: 'MESSAGES_UPSERT',
            data: [],
        }), routeParams)
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ status: 'ignored', reason: 'no_instance' })
    })

    it('does not expose incoming phone numbers or message content in production logs', async () => {
        enableEvolutionWebhook()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const send = vi.fn(async () => undefined)
        vi.doMock('@/modules/core/database/supabase-admin', () => ({
            supabaseAdmin: {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        contains: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: 'conn_123',
                                    organization_id: 'org_123',
                                },
                                error: null,
                            })),
                        })),
                    })),
                })),
            },
        }))
        vi.doMock('@/modules/infrastructure/automation/inngest/client', () => ({
            inngest: { send },
        }))

        const { POST } = await import('./route')
        const response = await POST(evolutionRequest({
            event: 'MESSAGES_UPSERT',
            instance: 'agency-main-secret',
            data: {
                key: {
                    id: 'wamid_123',
                    fromMe: false,
                    remoteJid: '15551234567@s.whatsapp.net',
                },
                pushName: 'Client Name',
                messageTimestamp: 1710000000,
                message: {
                    conversation: 'my card password is secret-value',
                },
            },
        }), routeParams)
        const body = await response.json()
        const logText = logSpy.mock.calls
            .map(call => call.map(value => {
                if (typeof value === 'string') return value
                try {
                    return JSON.stringify(value)
                } catch {
                    return String(value)
                }
            }).join(' '))
            .join('\n')

        expect(response.status).toBe(200)
        expect(body).toEqual({ status: 'ok', event: 'messages_processed', count: 1 })
        expect(send).toHaveBeenCalledWith({
            name: 'whatsapp/message.received',
            data: {
                incomingMessage: expect.objectContaining({
                    from: '15551234567',
                    content: expect.objectContaining({
                        text: 'my card password is secret-value',
                    }),
                    metadata: expect.objectContaining({
                        instance: 'agency-main-secret',
                    }),
                }),
            },
        })
        expect(logText).not.toContain('15551234567')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('agency-main-secret')
    })
})
