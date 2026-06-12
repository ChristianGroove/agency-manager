import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getCurrentOrganizationId: vi.fn(),
    supabaseFrom: vi.fn(),
    decrypt: vi.fn(),
    getGenerativeModel: vi.fn(),
    generateContent: vi.fn(),
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/infrastructure/ai-engine/encryption', () => ({
    decrypt: mocks.decrypt,
}))

vi.mock('openai', () => ({
    default: vi.fn(),
}))

vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn(() => ({
        getGenerativeModel: mocks.getGenerativeModel,
    })),
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
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

function makeCredentialsQuery(result: any) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(async () => result),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.decrypt.mockReset()
    mocks.getGenerativeModel.mockReset()
    mocks.generateContent.mockReset()
})

describe('transcription AI actions', () => {
    it('does not expose credential fetch failures in action results', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.supabaseFrom.mockReturnValue(makeCredentialsQuery({
            data: null,
            error: {
                message: 'database password secret-value failed reading ai credentials',
                code: '42501',
            },
        }))

        const { transcribeAudio } = await import('./transcription')
        const result = await transcribeAudio('https://cdn.example.com/audio.ogg')

        expect(result).toEqual({
            success: false,
            error: 'Audio transcription failed',
        })
    })

    it('does not expose provider failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('OPENAI_API_KEY', '')
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.decrypt.mockReturnValue('google-api-key-secret')
        mocks.supabaseFrom.mockReturnValue(makeCredentialsQuery({
            data: [{
                id: 'google-credential-secret',
                provider_id: 'google',
                status: 'active',
                api_key_encrypted: 'encrypted-google-secret',
            }],
            error: null,
        }))
        mocks.generateContent.mockRejectedValue(new Error('Google API key secret-value failed for audio-url-secret'))
        mocks.getGenerativeModel.mockReturnValue({
            generateContent: mocks.generateContent,
        })
        vi.stubGlobal('fetch', vi.fn(async () => new Response('audio-data', {
            status: 200,
            headers: { 'content-type': 'audio/ogg' },
        })))

        const { transcribeAudio } = await import('./transcription')
        const result = await transcribeAudio('https://cdn.example.com/audio-secret.ogg')

        expect(result).toEqual({
            success: false,
            error: 'Audio transcription failed',
        })

        const logText = collectConsoleCalls(warnSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('audio-url-secret')
        expect(logText).not.toContain('google-api-key-secret')
        expect(logText).not.toContain('encrypted-google-secret')
    })
})
