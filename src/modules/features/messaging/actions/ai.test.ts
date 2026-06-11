import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/infrastructure/ai-engine/service', () => ({
    AIEngine: {
        executeTask: mocks.executeTask,
    },
}))

vi.mock('@/modules/core/organizations/actions/crud', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
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
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateQuery(result: unknown = { error: null }) {
    const query: any = {
        eq: vi.fn(() => query),
        then: (resolve: (value: unknown) => void) => resolve(result),
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
    mocks.supabaseFrom.mockReset()
})

describe('messaging AI action wrappers', () => {
    it('refines draft content through the AI engine', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockResolvedValue({ data: '"Respuesta profesional"' })

        const { refineDraftContent } = await import('./ai')
        const result = await refineDraftContent('Responderemos pronto con el detalle solicitado')

        expect(result).toEqual({
            success: true,
            refined: 'Respuesta profesional',
        })
        expect(mocks.executeTask).toHaveBeenCalledWith({
            organizationId: 'org-current',
            taskType: 'messaging.refine_draft_v1',
            payload: { content: 'Responderemos pronto con el detalle solicitado' },
        })
    })

    it('does not expose draft refinement failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(new Error('openai key secret-value failed for customer@example.com'))

        const { refineDraftContent } = await import('./ai')
        const result = await refineDraftContent('Responderemos pronto con el detalle solicitado')

        expect(result).toEqual({
            success: false,
            error: 'Draft could not be refined',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('openai key')
    })

    it('does not expose smart reply failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(new Error('provider token secret-value failed for customer@example.com'))

        const { generateSmartReplies } = await import('./ai')
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
        expect(logText).not.toContain('provider token')
    })

    it('does not expose sentiment failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(new Error('api key secret-value failed for customer@example.com'))

        const { analyzeSentiment } = await import('./ai')
        const result = await analyzeSentiment('Cliente molesto con su factura')

        expect(result).toEqual({
            success: false,
            error: 'Sentiment analysis failed',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('api key')
    })

    it('does not expose intent failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(new Error('intent secret-value failed for customer@example.com'))

        const { detectIntent } = await import('./ai')
        const result = await detectIntent('Necesito soporte')

        expect(result).toEqual({
            success: false,
            error: 'Intent detection failed',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('intent secret')
    })

    it('scopes intent routing updates to the current organization', async () => {
        const ruleQuery = singleQuery({
            data: {
                set_priority: 'urgent',
            },
            error: null,
        })
        const conversationUpdate = updateQuery()

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'intent_routing_rules') return ruleQuery
            if (table === 'conversations') return conversationUpdate
            throw new Error(`Unexpected table ${table}`)
        })

        const { applyIntentRouting } = await import('./ai')
        await applyIntentRouting('conversation-1', 'org-current', 'billing_inquiry', 0.91)

        expect(ruleQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(ruleQuery.eq).toHaveBeenCalledWith('intent', 'billing_inquiry')
        expect(conversationUpdate.update).toHaveBeenCalledWith({ priority: 'urgent' })
        expect(conversationUpdate.query.eq).toHaveBeenCalledWith('id', 'conversation-1')
        expect(conversationUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
