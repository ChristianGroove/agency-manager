import { afterEach, describe, expect, it, vi } from 'vitest'

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

function command() {
    return {
        tenant_id: 'tenant-1',
        space_id: 'space-1',
        user_id: 'user-1',
        intent: 'ping',
        payload: {},
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
})

describe('VoiceClient', () => {
    it('sends the runtime token without logging the JWT', async () => {
        vi.stubEnv('PIXY_VOICE_SECRET', 'voice-secret')
        vi.stubEnv('VOICE_RUNTIME_URL', 'https://voice.pixy.test')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ trace_id: 'trace-1' }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)

        const { VoiceClient } = await import('./voice-client')
        const result = await VoiceClient.sendCommand(command())

        expect(result).toEqual({ status: 'accepted', trace_id: 'trace-1' })
        expect(fetchMock).toHaveBeenCalledWith(
            'https://voice.pixy.test/command',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: expect.stringMatching(/^Bearer eyJ/),
                }),
            })
        )

        const logText = collectConsoleCalls(logSpy)
        expect(logText).toContain('Runtime token generated')
        expect(logText).not.toContain('Generated Token')
        expect(logText).not.toContain('Bearer ')
        expect(logText).not.toContain('eyJ')
    })

    it('does not expose network failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('PIXY_VOICE_SECRET', 'voice-secret')
        vi.stubEnv('VOICE_RUNTIME_URL', 'https://voice.pixy.test')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('voice token secret-value failed during runtime request')
        }))

        const { VoiceClient } = await import('./voice-client')
        const result = await VoiceClient.sendCommand(command())

        expect(result).toEqual({
            status: 'error',
            error: 'Voice runtime request failed',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('voice token')

        const infoLogText = collectConsoleCalls(logSpy)
        expect(infoLogText).not.toContain('Bearer ')
        expect(infoLogText).not.toContain('eyJ')
    })
})
