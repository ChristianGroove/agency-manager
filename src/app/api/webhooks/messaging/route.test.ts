import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

function signedRequest(rawBody: string, url = 'https://pixy.test/api/webhooks/messaging') {
    const signature = 'sha256=' + createHmac('sha256', 'meta-secret').update(rawBody).digest('hex')
    return new NextRequest(url, {
        method: 'POST',
        headers: { 'x-hub-signature-256': signature },
        body: rawBody,
    })
}

describe('/api/webhooks/messaging', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/features/messaging/webhook-handler')
    })

    it('does not expose internal manager errors to webhook callers', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/features/messaging/webhook-handler', () => ({
            webhookManager: {
                registerProvider: vi.fn(),
                handleParsed: vi.fn(async () => {
                    throw new Error('db password secret-value failed to initialize')
                }),
            },
        }))

        const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })

        const { POST } = await import('./route')
        const response = await POST(signedRequest(rawBody))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal Server Error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('db password')

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
        expect(errorLogText).not.toContain('db password')
    })

    it('keeps accepting valid signed Meta webhook payloads', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        const registerProvider = vi.fn()
        const handleParsed = vi.fn(async () => ({ success: true }))
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.doMock('@/modules/features/messaging/webhook-handler', () => ({
            webhookManager: {
                registerProvider,
                handleParsed,
            },
        }))

        const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })

        const { POST } = await import('./route')
        const response = await POST(signedRequest(rawBody))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ status: 'ok' })
        expect(handleParsed).toHaveBeenCalledWith('whatsapp', { object: 'whatsapp_business_account', entry: [] })
    })
})
