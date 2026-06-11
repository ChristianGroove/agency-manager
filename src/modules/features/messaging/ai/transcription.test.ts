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
    GoogleGenerativeAI: vi.fn(function () {
        return {
            getGenerativeModel: mocks.getGenerativeModel,
        }
    }),
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

function makeSingleQuery(result: any) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
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
    it('rejects message IDs outside the current organization before reading cached metadata', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const messageQuery = makeSingleQuery({ data: null, error: null })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'messages') return messageQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { transcribeAudio } = await import('./transcription')
        const result = await transcribeAudio('https://cdn.example.com/audio.ogg', 'msg-foreign')

        expect(result).toEqual({ success: false, error: 'Message not found' })
        expect(messageQuery.eq).toHaveBeenCalledWith('id', 'msg-foreign')
        expect(messageQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.supabaseFrom).not.toHaveBeenCalledWith('ai_credentials')
    })

    it('returns cached transcriptions only for messages in the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const messageQuery = makeSingleQuery({
            data: { metadata: { transcription: 'hola cacheada' } },
            error: null,
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'messages') return messageQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { transcribeAudio } = await import('./transcription')
        const result = await transcribeAudio('https://cdn.example.com/audio.ogg', 'msg-1')

        expect(result).toEqual({ success: true, text: 'hola cacheada', debug: 'cache-hit' })
        expect(messageQuery.eq).toHaveBeenCalledWith('id', 'msg-1')
        expect(messageQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.supabaseFrom).not.toHaveBeenCalledWith('ai_credentials')
    })

    it('persists transcriptions only on messages in the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.decrypt.mockReturnValue('google-api-key')
        const initialMessageQuery = makeSingleQuery({
            data: { metadata: { existing: true } },
            error: null,
        })
        const currentMessageQuery = makeSingleQuery({
            data: { metadata: { existing: true } },
            error: null,
        })
        const credentialsQuery = makeCredentialsQuery({
            data: [{
                id: 'google-credential-1',
                provider_id: 'google',
                status: 'active',
                api_key_encrypted: 'encrypted-google',
            }],
            error: null,
        })
        const updateEqSpy = vi.fn()
        const updateQuery: any = {
            eq: updateEqSpy,
            then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve, reject),
        }
        updateEqSpy.mockImplementation(() => updateQuery)
        const updateSpy = vi.fn(() => updateQuery)
        const usageInsertSpy = vi.fn(async () => ({ error: null }))
        let messageCalls = 0
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'messages') {
                messageCalls++
                if (messageCalls === 1) return initialMessageQuery
                if (messageCalls === 2) return currentMessageQuery
                return { update: updateSpy }
            }
            if (table === 'ai_credentials') return credentialsQuery
            if (table === 'ai_usage_logs') return { insert: usageInsertSpy }
            throw new Error(`Unexpected table ${table}`)
        })
        mocks.generateContent.mockResolvedValue({
            response: Promise.resolve({
                text: () => 'hola transcrita',
            }),
        })
        mocks.getGenerativeModel.mockReturnValue({
            generateContent: mocks.generateContent,
        })
        vi.stubGlobal('fetch', vi.fn(async () => new Response('audio-data', {
            status: 200,
            headers: { 'content-type': 'audio/ogg' },
        })))

        const { transcribeAudio } = await import('./transcription')
        const result = await transcribeAudio('https://cdn.example.com/audio.ogg', 'msg-1')

        expect(result).toEqual({ success: true, text: 'hola transcrita', language: 'detected' })
        expect(initialMessageQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(currentMessageQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(updateSpy).toHaveBeenCalledWith({
            metadata: { existing: true, transcription: 'hola transcrita' },
        })
        expect(updateEqSpy).toHaveBeenCalledWith('id', 'msg-1')
        expect(updateEqSpy).toHaveBeenCalledWith('organization_id', 'org-current')
    })

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
