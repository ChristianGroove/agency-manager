import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    analyzeSentiment: vi.fn(),
    saveSentimentAnalysis: vi.fn(),
    autoEscalateIfNeeded: vi.fn(),
    detectIntent: vi.fn(),
    saveIntent: vi.fn(),
    applyIntentRouting: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
}))

vi.mock('@/modules/features/messaging/messaging-actions', () => ({
    analyzeSentiment: mocks.analyzeSentiment,
    saveSentimentAnalysis: mocks.saveSentimentAnalysis,
    autoEscalateIfNeeded: mocks.autoEscalateIfNeeded,
    detectIntent: mocks.detectIntent,
    saveIntent: mocks.saveIntent,
    applyIntentRouting: mocks.applyIntentRouting,
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
    return new Request('https://pixy.test/api/ai/analyze', {
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
    mocks.analyzeSentiment.mockReset()
    mocks.saveSentimentAnalysis.mockReset()
    mocks.autoEscalateIfNeeded.mockReset()
    mocks.detectIntent.mockReset()
    mocks.saveIntent.mockReset()
    mocks.applyIntentRouting.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.createClient.mockReset()
})

describe('/api/ai/analyze', () => {
    it('rejects anonymous requests before AI work or DB writes', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            messageContent: 'Necesito ayuda',
            conversationId: 'conv-1',
            messageId: 'msg-1',
        }))

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.analyzeSentiment).not.toHaveBeenCalled()
        expect(mocks.detectIntent).not.toHaveBeenCalled()
    })

    it('rejects oversized messages before consuming AI resources', async () => {
        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            messageContent: 'A'.repeat(12_001),
            conversationId: 'conv-1',
            messageId: 'msg-1',
        }))

        expect(response.status).toBe(413)
        expect(await response.json()).toEqual({ success: false, error: 'Message content is too long' })
        expect(mocks.getCurrentOrganizationId).not.toHaveBeenCalled()
        expect(mocks.analyzeSentiment).not.toHaveBeenCalled()
    })

    it('rejects conversations outside the current organization before AI work', async () => {
        const conversationQuery = makeQuery({ data: null, error: { message: 'not found' } })
        const supabase = {
            from: vi.fn().mockReturnValue(conversationQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue(supabase)

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            messageContent: 'Necesito ayuda',
            conversationId: 'conv-foreign',
            messageId: 'msg-1',
        }))

        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ success: false, error: 'Conversation not found' })
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.analyzeSentiment).not.toHaveBeenCalled()
        expect(mocks.saveIntent).not.toHaveBeenCalled()
    })

    it('uses the current organization for routing instead of trusting the request body', async () => {
        const conversationQuery = makeQuery({ data: { id: 'conv-1' }, error: null })
        const messageQuery = makeQuery({ data: { id: 'msg-1' }, error: null })
        const supabase = {
            from: vi.fn((table: string) => table === 'conversations' ? conversationQuery : messageQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue(supabase)
        mocks.analyzeSentiment.mockResolvedValue({
            success: true,
            result: {
                sentiment: 'urgent',
                score: -0.9,
                emotions: ['angry'],
                needsEscalation: true,
            },
        })
        mocks.detectIntent.mockResolvedValue({
            success: true,
            result: {
                intent: 'billing_inquiry',
                confidence: 0.91,
                extractedEntities: {},
            },
        })

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            messageContent: 'Necesito ayuda con la factura',
            conversationId: 'conv-1',
            messageId: 'msg-1',
            organizationId: 'org-attacker',
        }))

        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ success: true })
        expect(messageQuery.eq).toHaveBeenCalledWith('conversation_id', 'conv-1')
        expect(messageQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.saveSentimentAnalysis).toHaveBeenCalledWith(
            'msg-1',
            'conv-1',
            expect.objectContaining({ sentiment: 'urgent' })
        )
        expect(mocks.applyIntentRouting).toHaveBeenCalledWith(
            'conv-1',
            'org-current',
            'billing_inquiry',
            0.91
        )
    })

    it('does not expose AI analysis failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const conversationQuery = makeQuery({ data: { id: 'conv-1' }, error: null })
        const messageQuery = makeQuery({ data: { id: 'msg-1' }, error: null })
        const supabase = {
            from: vi.fn((table: string) => table === 'conversations' ? conversationQuery : messageQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue(supabase)
        mocks.analyzeSentiment.mockRejectedValue(
            new Error('openai api key secret-value failed analyzing sentiment')
        )
        mocks.detectIntent.mockResolvedValue({
            success: true,
            result: {
                intent: 'support_request',
                confidence: 0.7,
            },
        })

        const { POST } = await import('./route')
        const response = await POST(makeRequest({
            messageContent: 'Necesito ayuda',
            conversationId: 'conv-1',
            messageId: 'msg-1',
        }))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('AI analysis failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('api key')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('api key')
    })
})
