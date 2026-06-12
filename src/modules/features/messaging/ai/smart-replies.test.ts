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
        const insert = vi.fn(async () => ({
            error: {
                message: 'database password secret-value failed for conv-secret-id',
                code: '42501',
            },
        }))
        const from = vi.fn(() => ({ insert }))
        mocks.createClient.mockResolvedValue({ from })

        const { logSuggestion } = await import('./smart-replies')
        await logSuggestion({
            conversationId: 'conv-secret-id',
            messageId: 'msg-secret-id',
            suggestions: [{ type: 'short', text: 'Claro.', tokens: 2 }],
            generationTimeMs: 12,
        })

        expect(from).toHaveBeenCalledWith('ai_suggestions')
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('conv-secret-id')
        expect(logText).not.toContain('msg-secret-id')
        expect(logText).toContain('hasMessage')
    })
})
