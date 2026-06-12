import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('openai', () => ({
    default: vi.fn(),
}))

vi.mock('@/modules/infrastructure/ai-engine/service', () => ({
    AIEngine: {
        executeTask: mocks.executeTask,
    },
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.executeTask.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('intent detection AI actions', () => {
    it('detects intent through the AI engine', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockResolvedValue({
            data: {
                intent: 'billing_inquiry',
                confidence: 0.91,
                extractedEntities: { invoiceId: 'invoice-1' },
            },
        })

        const { detectIntent } = await import('./intent-detection')
        const result = await detectIntent('Tengo una pregunta de facturacion')

        expect(result).toEqual({
            success: true,
            result: expect.objectContaining({
                intent: 'billing_inquiry',
                confidence: 0.91,
                suggestedTeam: 'billing',
                suggestedSkills: ['billing', 'payments'],
            }),
        })
        expect(mocks.executeTask).toHaveBeenCalledWith({
            organizationId: 'org-current',
            taskType: 'inbox.intent_v1',
            payload: { message: 'Tengo una pregunta de facturacion' },
        })
    })

    it('does not expose AI intent failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(
            Object.assign(new Error('openai key secret-value failed for customer@example.com'), {
                statusCode: 429,
            })
        )

        const { detectIntent } = await import('./intent-detection')
        const result = await detectIntent('Necesito soporte')

        expect(result).toEqual({
            success: false,
            error: 'Intent detection failed',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('openai key')
    })

    it('does not expose intent persistence failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const insert = vi.fn(async () => ({
            error: {
                message: 'database password secret-value failed for conv-secret-id',
                code: '42501',
            },
        }))
        mocks.supabaseFrom.mockReturnValue({ insert })

        const { saveIntent } = await import('./intent-detection')
        await saveIntent('conv-secret-id', 'msg-secret-id', {
            intent: 'billing_inquiry',
            confidence: 0.9,
            extractedEntities: { invoiceId: 'invoice-secret-id' },
            suggestedTeam: 'billing',
            suggestedSkills: ['payments'],
        })

        expect(mocks.supabaseFrom).toHaveBeenCalledWith('conversation_intents')
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('conv-secret-id')
        expect(logText).not.toContain('msg-secret-id')
        expect(logText).not.toContain('invoice-secret-id')
    })

    it('does not expose routed conversation ids or tag values in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const ruleQuery: any = {
            select: vi.fn(() => ruleQuery),
            eq: vi.fn(() => ruleQuery),
            gte: vi.fn(() => ruleQuery),
            limit: vi.fn(() => ruleQuery),
            single: vi.fn(async () => ({
                data: {
                    add_tags: ['vip-secret-tag'],
                    set_priority: 'urgent',
                },
            })),
        }
        const conversationSelectQuery: any = {
            select: vi.fn(() => conversationSelectQuery),
            eq: vi.fn(() => conversationSelectQuery),
            single: vi.fn(async () => ({
                data: {
                    tags: ['old-secret-tag'],
                },
            })),
        }
        const conversationUpdateQuery: any = {
            update: vi.fn(() => conversationUpdateQuery),
            eq: vi.fn(() => conversationUpdateQuery),
        }
        const intentUpdateQuery: any = {
            update: vi.fn(() => intentUpdateQuery),
            eq: vi.fn(() => intentUpdateQuery),
        }
        let conversationCalls = 0
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'intent_routing_rules') return ruleQuery
            if (table === 'conversations') {
                conversationCalls += 1
                return conversationCalls === 1 ? conversationSelectQuery : conversationUpdateQuery
            }
            if (table === 'conversation_intents') return intentUpdateQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { applyIntentRouting } = await import('./intent-detection')
        await applyIntentRouting('conv-secret-id', 'org-secret-id', 'billing_inquiry', 0.91)

        expect(conversationUpdateQuery.update).toHaveBeenCalledWith({
            tags: ['old-secret-tag', 'vip-secret-tag'],
            priority: 'urgent',
        })
        expect(conversationSelectQuery.eq).toHaveBeenCalledWith('id', 'conv-secret-id')
        expect(conversationSelectQuery.eq).toHaveBeenCalledWith('organization_id', 'org-secret-id')
        expect(conversationUpdateQuery.eq).toHaveBeenCalledWith('id', 'conv-secret-id')
        expect(conversationUpdateQuery.eq).toHaveBeenCalledWith('organization_id', 'org-secret-id')
        expect(intentUpdateQuery.eq).toHaveBeenCalledWith('conversation_id', 'conv-secret-id')
        expect(intentUpdateQuery.eq).toHaveBeenCalledWith('intent', 'billing_inquiry')

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('conv-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('vip-secret-tag')
        expect(logText).not.toContain('old-secret-tag')
        expect(logText).toContain('updateKeys')
    })

    it('does not route or mark intents when the conversation is outside the organization', async () => {
        const ruleQuery: any = {
            select: vi.fn(() => ruleQuery),
            eq: vi.fn(() => ruleQuery),
            gte: vi.fn(() => ruleQuery),
            limit: vi.fn(() => ruleQuery),
            single: vi.fn(async () => ({
                data: {
                    add_tags: ['vip'],
                    set_priority: 'urgent',
                },
            })),
        }
        const conversationSelectQuery: any = {
            select: vi.fn(() => conversationSelectQuery),
            eq: vi.fn(() => conversationSelectQuery),
            single: vi.fn(async () => ({ data: null })),
        }
        const conversationUpdateQuery: any = {
            update: vi.fn(() => conversationUpdateQuery),
            eq: vi.fn(() => conversationUpdateQuery),
        }
        const intentUpdateQuery: any = {
            update: vi.fn(() => intentUpdateQuery),
            eq: vi.fn(() => intentUpdateQuery),
        }

        let conversationCalls = 0
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'intent_routing_rules') return ruleQuery
            if (table === 'conversations') {
                conversationCalls += 1
                return conversationCalls === 1 ? conversationSelectQuery : conversationUpdateQuery
            }
            if (table === 'conversation_intents') return intentUpdateQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { applyIntentRouting } = await import('./intent-detection')
        await applyIntentRouting('conv-foreign', 'org-current', 'billing_inquiry', 0.91)

        expect(conversationSelectQuery.eq).toHaveBeenCalledWith('id', 'conv-foreign')
        expect(conversationSelectQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationUpdateQuery.update).not.toHaveBeenCalled()
        expect(intentUpdateQuery.update).not.toHaveBeenCalled()
    })
})
