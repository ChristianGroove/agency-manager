import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

function signedStripeRequest(rawBody: string) {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHmac('sha256', 'stripe-secret')
        .update(`${timestamp}.${rawBody}`)
        .digest('hex')

    return new Request('https://pixy.test/api/webhooks/stripe', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'stripe-signature': `t=${timestamp},v1=${signature}`,
        },
        body: rawBody,
    }) as any
}

describe('/api/webhooks/stripe', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/infrastructure/automation/inngest/client')
    })

    function enableStripeWebhook() {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'stripe-secret')
    }

    it('does not expose internal dispatch failures to webhook callers', async () => {
        enableStripeWebhook()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/automation/inngest/client', () => ({
            inngest: {
                send: vi.fn(async () => {
                    throw new Error('stripe queue password secret-value failed')
                }),
            },
        }))

        const { POST } = await import('./route')
        const response = await POST(signedStripeRequest(JSON.stringify({
            id: 'evt_123',
            type: 'invoice.paid',
        })))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal Server Error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('stripe queue password')

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
        expect(errorLogText).not.toContain('stripe queue password')
    })

    it('keeps accepting valid signed Stripe webhook payloads', async () => {
        enableStripeWebhook()
        const send = vi.fn(async () => ({ ids: ['evt_123'] }))
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/automation/inngest/client', () => ({
            inngest: { send },
        }))

        const event = { id: 'evt_123', type: 'invoice.paid' }
        const { POST } = await import('./route')
        const response = await POST(signedStripeRequest(JSON.stringify(event)))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ received: true, async: true })
        expect(send).toHaveBeenCalledWith({
            name: 'stripe/webhook.received',
            data: { event },
        })
    })
})
