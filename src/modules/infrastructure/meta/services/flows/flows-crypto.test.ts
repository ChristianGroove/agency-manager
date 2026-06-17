import crypto from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

function callsToText(calls: unknown[][]) {
    return calls
        .map(call => call.map(value => {
            if (typeof value === 'string') return value
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

describe('FlowsCrypto production logging', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    it('does not print generated private keys in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        vi.stubEnv('FLOWS_PRIVATE_KEY', 'test-private-key')
        vi.stubEnv('FLOWS_PUBLIC_KEY', 'test-public-key')

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)

        const { generateKeypair } = await import('./flows-crypto')
        generateKeypair()

        const logText = callsToText(logSpy.mock.calls)
        expect(logText).toContain('output suppressed')
        expect(logText).not.toContain('BEGIN PRIVATE KEY')
        expect(logText).not.toContain('END PRIVATE KEY')
    })

    it('does not expose raw crypto failure details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')
        vi.stubEnv('FLOWS_PRIVATE_KEY', 'test-private-key')
        vi.stubEnv('FLOWS_PUBLIC_KEY', 'test-public-key')

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.spyOn(crypto, 'privateDecrypt').mockImplementation((() => {
            throw new Error('private key path C:\\secrets\\flows.pem token=secret-value')
        }) as any)
        vi.spyOn(crypto, 'createCipheriv').mockImplementation((() => {
            throw new Error('aes key token=secret-value')
        }) as any)

        const { FlowsCrypto } = await import('./flows-crypto')
        const flowsCrypto = new FlowsCrypto()

        expect(() => flowsCrypto.decryptRequest({
            encrypted_aes_key: Buffer.from('encrypted-key').toString('base64'),
            encrypted_flow_data: Buffer.from('encrypted-data').toString('base64'),
            initial_vector: Buffer.alloc(12).toString('base64'),
        })).toThrow('Failed to decrypt Flow request')

        expect(() => flowsCrypto.encryptResponse(
            { ok: true },
            Buffer.alloc(16),
            Buffer.alloc(12)
        )).toThrow('Failed to encrypt Flow response')

        const errorText = callsToText(errorSpy.mock.calls)
        expect(errorText).toContain('[FlowsCrypto] Decryption failed:')
        expect(errorText).toContain('[FlowsCrypto] Encryption failed:')
        expect(errorText).not.toContain('secret-value')
        expect(errorText).not.toContain('flows.pem')
        expect(errorText).not.toContain('aes key token')
    })
})
