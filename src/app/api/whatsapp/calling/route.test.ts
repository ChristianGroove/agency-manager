import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

function signedRequest(rawBody: string) {
    const signature = 'sha256=' + createHmac('sha256', 'meta-secret').update(rawBody).digest('hex')
    return new Request('https://pixy.test/api/whatsapp/calling', {
        method: 'POST',
        headers: { 'x-hub-signature-256': signature },
        body: rawBody,
    }) as any
}

describe('/api/whatsapp/calling', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/infrastructure/meta/services/calling/calling-signaling-handler')
        vi.doUnmock('@/modules/infrastructure/meta/services/calling/call-permission-manager')
        vi.doUnmock('@/modules/infrastructure/meta/services/calling/call-hours-manager')
    })

    it('does not expose internal calling errors to webhook callers', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/calling/calling-signaling-handler', () => ({
            callingSignalingHandler: {
                getAvailableCapacity: vi.fn(),
                processOffer: vi.fn(),
                releaseRTPPort: vi.fn(),
            },
        }))
        vi.doMock('@/modules/infrastructure/meta/services/calling/call-permission-manager', () => ({
            callPermissionManager: {
                resetLimitsAfterCall: vi.fn(),
            },
        }))
        vi.doMock('@/modules/infrastructure/meta/services/calling/call-hours-manager', () => ({
            callHoursManager: {
                isWithinCallHours: vi.fn(() => {
                    throw new Error('calling token secret-value failed to load')
                }),
                handleOutOfHours: vi.fn(),
            },
        }))

        const rawBody = JSON.stringify({
            entry: [{
                changes: [{
                    field: 'calls',
                    value: {
                        call_id: 'call_123',
                        event_type: 'ringing',
                        from: '+571111111111',
                        to: '+572222222222',
                        sdp_offer: 'v=0',
                    },
                }],
            }],
        })

        const { POST } = await import('./route')
        const response = await POST(signedRequest(rawBody))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Webhook processing failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('calling token')

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
        expect(errorLogText).not.toContain('calling token')
    })

    it('keeps accepting valid signed calling webhooks without call changes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { POST } = await import('./route')
        const response = await POST(signedRequest(JSON.stringify({ entry: [] })))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ success: true })
    })
})
