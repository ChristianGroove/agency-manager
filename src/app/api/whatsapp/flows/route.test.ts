import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

function signedRequest(rawBody: string) {
    const signature = 'sha256=' + createHmac('sha256', 'meta-secret').update(rawBody).digest('hex')
    return new Request('https://pixy.test/api/whatsapp/flows', {
        method: 'POST',
        headers: { 'x-hub-signature-256': signature },
        body: rawBody,
    }) as any
}

describe('/api/whatsapp/flows', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/infrastructure/meta/services/flows/flows-crypto')
    })

    it('does not expose internal crypto errors to webhook callers', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/flows/flows-crypto', () => ({
            flowsCrypto: {
                extractAESKey: vi.fn(() => {
                    throw new Error('private key path C:\\secrets\\meta.pem token=secret-value')
                }),
                decryptRequest: vi.fn(),
                encryptResponse: vi.fn(),
            },
        }))

        const rawBody = JSON.stringify({
            encrypted_aes_key: 'bad-key',
            encrypted_flow_data: 'bad-data',
            initial_vector: Buffer.alloc(16).toString('base64'),
        })

        const { POST } = await import('./route')
        const response = await POST(signedRequest(rawBody))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Data exchange failed')
        expect(responseText).not.toContain('private key path')
        expect(responseText).not.toContain('secret-value')

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
        expect(errorLogText).not.toContain('private key path')
        expect(errorLogText).not.toContain('secret-value')
    })

    it('does not write raw decrypted action payload values to logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/flows/flows-crypto', () => ({
            flowsCrypto: {
                extractAESKey: vi.fn(() => Buffer.alloc(32)),
                decryptRequest: vi.fn(() => ({
                    version: '3.0',
                    screen: 'CONSENT',
                    action_payload: {
                        action: 'log_consent',
                        user_email: 'client@example.com',
                        consent_type: 'marketing',
                    },
                })),
                encryptResponse: vi.fn(() => 'encrypted-payload'),
            },
        }))

        const rawBody = JSON.stringify({
            encrypted_aes_key: 'encrypted-key',
            encrypted_flow_data: 'encrypted-data',
            initial_vector: Buffer.alloc(16).toString('base64'),
        })

        const { POST } = await import('./route')
        const response = await POST(signedRequest(rawBody))
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
        expect(body.encrypted_data).toBe('encrypted-payload')
        expect(logText).not.toContain('client@example.com')
    })
})
