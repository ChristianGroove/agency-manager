import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    generateSmartReplies: vi.fn(),
    logSuggestion: vi.fn(),
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
}))

vi.mock('@/modules/features/messaging/messaging-actions', () => ({
    generateSmartReplies: mocks.generateSmartReplies,
    logSuggestion: mocks.logSuggestion,
}))

vi.mock('@/modules/infrastructure/ai-engine/service', () => ({
    AIEngine: {
        executeTask: mocks.executeTask,
    },
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

function makeRequest(path: string, body: Record<string, unknown>) {
    return new Request(`https://pixy.test${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

function makeSingleQuery(result: any) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
        update: vi.fn().mockReturnThis(),
    }
}

function makeListQuery(result: any) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(result),
    }
}

afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
})

describe('inbox AI API routes', () => {
    it('rejects anonymous smart replies before reading conversations or running AI', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { POST } = await import('./smart-replies/route')
        const response = await POST(makeRequest('/api/ai/smart-replies', {
            conversationId: 'conv-1',
        }) as any)

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.generateSmartReplies).not.toHaveBeenCalled()
    })

    it('rejects smart replies for conversations outside the current organization before AI work', async () => {
        const conversationQuery = makeSingleQuery({ data: null, error: { message: 'not found' } })
        const supabase = {
            from: vi.fn().mockReturnValue(conversationQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue(supabase)

        const { POST } = await import('./smart-replies/route')
        const response = await POST(makeRequest('/api/ai/smart-replies', {
            conversationId: 'conv-foreign',
        }) as any)

        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ success: false, error: 'Conversation not found' })
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.generateSmartReplies).not.toHaveBeenCalled()
    })

    it('generates smart replies only after conversation ownership is verified', async () => {
        const conversationQuery = makeSingleQuery({
            data: { priority: 'normal', tags: ['sales'], leads: null },
            error: null,
        })
        const messagesQuery = makeListQuery({
            data: [
                { id: 'msg-new', content: 'Hola, necesito precio', direction: 'incoming', created_at: '2026-01-02T00:00:00Z' },
                { id: 'msg-old', content: 'Bienvenido', direction: 'outgoing', created_at: '2026-01-01T00:00:00Z' },
            ],
            error: null,
        })
        const supabase = {
            from: vi.fn((table: string) => table === 'conversations' ? conversationQuery : messagesQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue(supabase)
        mocks.generateSmartReplies.mockResolvedValue({
            success: true,
            replies: [{ type: 'short', text: 'Claro, te ayudo.', tokens: 5 }],
            generationTimeMs: 42,
            usedKnowledge: 1,
        })

        const { POST } = await import('./smart-replies/route')
        const response = await POST(makeRequest('/api/ai/smart-replies', {
            conversationId: ' conv-1 ',
        }) as any)

        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ success: true, usedKnowledge: 1 })
        expect(conversationQuery.eq).toHaveBeenCalledWith('id', 'conv-1')
        expect(mocks.generateSmartReplies).toHaveBeenCalledWith(expect.objectContaining({
            conversationHistory: [
                expect.objectContaining({ content: 'Bienvenido' }),
                expect.objectContaining({ content: 'Hola, necesito precio' }),
            ],
            customerContext: expect.objectContaining({ tags: ['sales'] }),
        }))
        expect(mocks.logSuggestion).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: 'conv-1',
            messageId: 'msg-new',
        }))
    })

    it('rejects anonymous voice analysis before reading messages or running AI', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { POST } = await import('./analyze-voice/route')
        const response = await POST(makeRequest('/api/ai/analyze-voice', {
            messageId: 'msg-1',
        }) as any)

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.executeTask).not.toHaveBeenCalled()
    })

    it('rejects voice analysis for messages outside the current organization before AI work', async () => {
        const messageQuery = makeSingleQuery({
            data: { metadata: { transcription: 'hola' }, conversation_id: 'conv-foreign' },
            error: null,
        })
        const conversationQuery = makeSingleQuery({ data: null, error: { message: 'not found' } })
        const supabase = {
            from: vi.fn((table: string) => table === 'messages' ? messageQuery : conversationQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue(supabase)

        const { POST } = await import('./analyze-voice/route')
        const response = await POST(makeRequest('/api/ai/analyze-voice', {
            messageId: 'msg-1',
        }) as any)

        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ success: false, error: 'Message not found' })
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.executeTask).not.toHaveBeenCalled()
    })

    it('updates voice analysis metadata only after message ownership is verified', async () => {
        const messageQuery = makeSingleQuery({
            data: { metadata: { transcription: 'audio original' }, conversation_id: 'conv-1' },
            error: null,
        })
        const conversationQuery = makeSingleQuery({ data: { id: 'conv-1' }, error: null })
        const supabase = {
            from: vi.fn((table: string) => table === 'messages' ? messageQuery : conversationQuery),
        }

        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue(supabase)
        mocks.executeTask.mockResolvedValue({
            success: true,
            data: { summary: 'resumen' },
        })

        const { POST } = await import('./analyze-voice/route')
        const response = await POST(makeRequest('/api/ai/analyze-voice', {
            messageId: ' msg-1 ',
        }) as any)

        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ success: true, analysis: { summary: 'resumen' } })
        expect(mocks.executeTask).toHaveBeenCalledWith({
            organizationId: 'org-current',
            taskType: 'media.analyze_voice_v1',
            payload: { text: 'audio original' },
        })
        expect(messageQuery.update).toHaveBeenCalledWith({
            metadata: expect.objectContaining({
                transcription: 'audio original',
                voice_analysis: expect.objectContaining({ summary: 'resumen' }),
            }),
        })
        expect(messageQuery.eq).toHaveBeenCalledWith('id', 'msg-1')
    })
})
