import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    lookup: vi.fn(),
    transcribeAudio: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
}))

vi.mock('dns/promises', () => ({
    default: { lookup: mocks.lookup },
    lookup: mocks.lookup,
}))

vi.mock('@/modules/features/messaging/messaging-actions', () => ({
    transcribeAudio: mocks.transcribeAudio,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

function makeQuery(result: any) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
    }
}

function makeRequest(body: Record<string, unknown>) {
    return new Request('https://pixy.test/api/ai/transcribe', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

function setupProductionRuntime() {
    vi.stubEnv('VERCEL_ENV', 'production')
}

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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.lookup.mockReset()
    mocks.transcribeAudio.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.createClient.mockReset()
})

describe('/api/ai/transcribe', () => {
    it('rejects anonymous requests before DNS checks or AI work', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            audioUrl: 'https://cdn.example.com/audio.ogg',
        }) as any)

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.lookup).not.toHaveBeenCalled()
        expect(mocks.transcribeAudio).not.toHaveBeenCalled()
    })

    it('blocks localhost audio URLs before server-side fetch', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            audioUrl: 'http://localhost/audio.ogg',
        }) as any)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ success: false, error: 'Private audio hosts are not allowed' })
        expect(mocks.lookup).not.toHaveBeenCalled()
        expect(mocks.transcribeAudio).not.toHaveBeenCalled()
    })

    it('blocks audio hostnames that resolve to private addresses', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.lookup.mockResolvedValue([{ address: '10.0.0.8', family: 4 }])

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            audioUrl: 'https://media.example.com/audio.ogg',
        }) as any)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ success: false, error: 'Private audio hosts are not allowed' })
        expect(mocks.lookup).toHaveBeenCalledWith('media.example.com', { all: true, verbatim: true })
        expect(mocks.transcribeAudio).not.toHaveBeenCalled()
    })

    it('rejects message IDs outside the current organization before transcription', async () => {
        const messageQuery = makeQuery({ data: { id: 'msg-1', conversation_id: 'conv-foreign' }, error: null })
        const conversationQuery = makeQuery({ data: null, error: { message: 'not found' } })
        const supabase = {
            from: vi.fn((table: string) => table === 'messages' ? messageQuery : conversationQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
        mocks.createClient.mockResolvedValue(supabase)

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            audioUrl: 'https://cdn.example.com/audio.ogg',
            messageId: 'msg-1',
        }) as any)

        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ success: false, error: 'Message not found' })
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.transcribeAudio).not.toHaveBeenCalled()
    })

    it('transcribes public audio only after message ownership is verified', async () => {
        const messageQuery = makeQuery({ data: { id: 'msg-1', conversation_id: 'conv-1' }, error: null })
        const conversationQuery = makeQuery({ data: { id: 'conv-1' }, error: null })
        const supabase = {
            from: vi.fn((table: string) => table === 'messages' ? messageQuery : conversationQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
        mocks.createClient.mockResolvedValue(supabase)
        mocks.transcribeAudio.mockResolvedValue({ success: true, text: 'hola' })

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            audioUrl: ' https://cdn.example.com/audio.ogg ',
            messageId: 'msg-1',
        }) as any)

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ success: true, text: 'hola' })
        expect(messageQuery.eq).toHaveBeenCalledWith('id', 'msg-1')
        expect(mocks.transcribeAudio).toHaveBeenCalledWith('https://cdn.example.com/audio.ogg', 'msg-1')
    })

    it('does not expose transcription failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
        mocks.transcribeAudio.mockRejectedValue(
            new Error('openai api key secret-value failed transcribing audio')
        )

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            audioUrl: 'https://cdn.example.com/audio.ogg',
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Audio transcription failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('api key')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('api key')
    })
})
