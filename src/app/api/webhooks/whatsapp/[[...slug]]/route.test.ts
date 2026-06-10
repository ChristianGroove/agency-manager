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
})
