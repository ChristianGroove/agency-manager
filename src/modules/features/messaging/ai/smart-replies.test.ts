import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
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

function singleQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateQuery(result: unknown = { error: null }) {
    const query: any = {
        eq: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return {
        update: vi.fn(() => query),
        query,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.executeTask.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.createClient.mockReset()
})

describe('smart replies AI actions', () => {
    it('generates smart replies through the AI engine', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockResolvedValue({
            data: {
                short: 'Claro.',
                medium: 'Claro, te ayudo con eso.',
                detailed: 'Claro, te ayudo con eso y reviso los detalles.',
            },
            context: [{ id: 'knowledge-1' }],
        })

        const { generateSmartReplies } = await import('./smart-replies')
        const result = await generateSmartReplies({
            conversationHistory: [{
                content: 'Necesito precio',
                direction: 'incoming',
                created_at: '2026-01-01T00:00:00Z',
            }],
        })

        expect(result.success).toBe(true)
        expect(result.usedKnowledge).toBe(1)
        expect(result.replies).toEqual([
            expect.objectContaining({ type: 'short', text: 'Claro.' }),
            expect.objectContaining({ type: 'medium', text: 'Claro, te ayudo con eso.' }),
            expect.objectContaining({ type: 'detailed', text: 'Claro, te ayudo con eso y reviso los detalles.' }),
        ])
        expect(mocks.executeTask).toHaveBeenCalledWith(expect.objectContaining({
            organizationId: 'org-current',
            taskType: 'inbox.smart_replies_v1',
        }))
    })

    it('does not expose AI generation failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(
            Object.assign(new Error('openai key secret-value failed for customer@example.com'), {
                statusCode: 429,
            })
        )

        const { generateSmartReplies } = await import('./smart-replies')
        const result = await generateSmartReplies({
            conversationHistory: [{
                content: 'Necesito precio',
                direction: 'incoming',
                created_at: '2026-01-01T00:00:00Z',
            }],
        })

        expect(result).toEqual({
            success: false,
            error: 'Smart replies could not be generated',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('openai key')
    })

    it('does not expose draft refinement failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(new Error('provider token secret-value failed while refining draft'))

        const { refineDraftContent } = await import('./smart-replies')
        const result = await refineDraftContent('Responderemos pronto con el detalle solicitado')

        expect(result).toEqual({
            success: false,
            error: 'Draft could not be refined',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('provider token')
    })

    it('does not expose suggestion logging failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const conversationQuery = singleQuery({ data: { id: 'conv-secret-id' }, error: null })
        const messageQuery = singleQuery({ data: { id: 'msg-secret-id' }, error: null })
        const insert = vi.fn(async () => ({
            error: {
                message: 'database password secret-value failed for conv-secret-id',
                code: '42501',
            },
        }))
        const from = vi.fn((table: string) => {
            if (table === 'conversations') return conversationQuery
            if (table === 'messages') return messageQuery
            if (table === 'ai_suggestions') return { insert }
            throw new Error(`Unexpected table ${table}`)
        })
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue({ from })

        const { logSuggestion } = await import('./smart-replies')
        await logSuggestion({
            conversationId: 'conv-secret-id',
            messageId: 'msg-secret-id',
            suggestions: [{ type: 'short', text: 'Claro.', tokens: 2 }],
            generationTimeMs: 12,
        })

        expect(from).toHaveBeenCalledWith('ai_suggestions')
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(messageQuery.eq).toHaveBeenCalledWith('conversation_id', 'conv-secret-id')
        expect(messageQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('conv-secret-id')
        expect(logText).not.toContain('msg-secret-id')
        expect(logText).toContain('hasMessage')
    })

    it('does not log suggestions for conversations outside the current organization', async () => {
        const conversationQuery = singleQuery({ data: null, error: { message: 'not found' } })
        const insert = vi.fn()
        const from = vi.fn((table: string) => {
            if (table === 'conversations') return conversationQuery
            if (table === 'ai_suggestions') return { insert }
            throw new Error(`Unexpected table ${table}`)
        })
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue({ from })

        const { logSuggestion } = await import('./smart-replies')
        await logSuggestion({
            conversationId: 'conv-foreign',
            messageId: 'msg-foreign',
            suggestions: [{ type: 'short', text: 'Claro.', tokens: 2 }],
            generationTimeMs: 12,
        })

        expect(conversationQuery.eq).toHaveBeenCalledWith('id', 'conv-foreign')
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(insert).not.toHaveBeenCalled()
    })

    it('marks suggestions as used only after proving organization access', async () => {
        const suggestionQuery = singleQuery({
            data: { id: 'suggestion-1', conversation_id: 'conv-current' },
            error: null,
        })
        const conversationQuery = singleQuery({ data: { id: 'conv-current' }, error: null })
        const suggestionUpdate = updateQuery()
        let suggestionCalls = 0
        const from = vi.fn((table: string) => {
            if (table === 'ai_suggestions') {
                suggestionCalls += 1
                return suggestionCalls === 1 ? suggestionQuery : suggestionUpdate
            }
            if (table === 'conversations') return conversationQuery
            throw new Error(`Unexpected table ${table}`)
        })
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue({ from })

        const { markSuggestionUsed } = await import('./smart-replies')
        await markSuggestionUsed('suggestion-1', 'short', 'Mensaje final', true)

        expect(suggestionQuery.eq).toHaveBeenCalledWith('id', 'suggestion-1')
        expect(conversationQuery.eq).toHaveBeenCalledWith('id', 'conv-current')
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(suggestionUpdate.update).toHaveBeenCalledWith(expect.objectContaining({
            selected_response: 'short',
            final_message: 'Mensaje final',
            was_edited: true,
        }))
        expect(suggestionUpdate.query.eq).toHaveBeenCalledWith('id', 'suggestion-1')
        expect(suggestionUpdate.query.eq).toHaveBeenCalledWith('conversation_id', 'conv-current')
    })
})
