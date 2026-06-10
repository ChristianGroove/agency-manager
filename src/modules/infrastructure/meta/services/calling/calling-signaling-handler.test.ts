import { afterEach, describe, expect, it, vi } from 'vitest'

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
            if (typeof value === 'string') return value
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

function validSdpOffer(secretKey: string) {
    return [
        'v=0',
        'o=- 123 1 IN IP4 192.0.2.10',
        's=Meta Call',
        'c=IN IP4 192.0.2.10',
        't=0 0',
        'm=audio 40000 RTP/SAVP 111',
        'a=rtpmap:111 opus/48000/2',
        `a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:${secretKey}`,
        '',
    ].join('\r\n')
}

describe('CallingSignalingHandler', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it('does not expose call IDs or SDP crypto material in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('VOIP_SERVER_IP', '203.0.113.10')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { CallingSignalingHandler } = await import('./calling-signaling-handler')
        const result = await new CallingSignalingHandler().processOffer({
            callId: 'call_secret_id',
            fromPhoneNumber: '+15551234567',
            sdpOffer: validSdpOffer('sdp-crypto-secret-value'),
        })
        const logText = collectConsoleCalls(logSpy)

        expect(result.sdpAnswer).toContain('call_secret_id')
        expect(result.sdpAnswer).toContain('sdp-crypto-secret-value')
        expect(result.callSetup.callId).toBe('call_secret_id')
        expect(logText).not.toContain('call_secret_id')
        expect(logText).not.toContain('sdp-crypto-secret-value')
        expect(logText).toContain('sdpLength')
    })
})
