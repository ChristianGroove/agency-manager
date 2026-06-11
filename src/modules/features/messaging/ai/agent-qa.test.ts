import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
    supabaseAdminFrom: vi.fn(),
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

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseAdminFrom,
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

function makeCacheQuery(result: any) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function makeMessagesQuery(result: any) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        or: vi.fn(() => query),
        limit: vi.fn(() => query),
        order: vi.fn(async () => result),
    }

    return query
}

function makeInsertQuery(result: any = { error: null }) {
    return {
        insert: vi.fn(async () => result),
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.executeTask.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.createClient.mockReset()
    mocks.supabaseAdminFrom.mockReset()
})

describe('agent QA AI actions', () => {
    it('returns cached QA reports without running AI', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue({ from: vi.fn() })
        mocks.supabaseAdminFrom.mockReturnValue(makeCacheQuery({
            data: {
                report: {
                    empathy: 9,
                    resolution: 8,
                    clarity: 9,
                    speed: 7,
                    grammar: 10,
                    overallScore: 8.6,
                    strengths: ['Claro'],
                    improvements: ['Mas detalle'],
                },
                messages_analyzed_count: 12,
            },
        }))

        const { analyzeAgentPerformance } = await import('./agent-qa')
        const result = await analyzeAgentPerformance('agent-1', 25)

        expect(result).toEqual({
            success: true,
            report: expect.objectContaining({ overallScore: 8.6 }),
            messagesAnalyzed: 12,
        })
        expect(mocks.executeTask).not.toHaveBeenCalled()
    })

    it('scopes analyzed messages to the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const cacheQuery = makeCacheQuery({ data: null })
        const reportInsert = makeInsertQuery()
        const messagesQuery = makeMessagesQuery({
            data: [
                { content: 'Mensaje 1' },
                { content: 'Mensaje 2' },
                { content: 'Mensaje 3' },
                { content: 'Mensaje 4' },
                { content: 'Mensaje 5' },
            ],
            error: null,
        })

        mocks.supabaseAdminFrom
            .mockReturnValueOnce(cacheQuery)
            .mockReturnValueOnce(reportInsert)
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'messages') return messagesQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        })
        mocks.executeTask.mockResolvedValue({
            data: {
                empathy: 8,
                resolution: 8,
                clarity: 8,
                speed: 8,
                grammar: 8,
                overallScore: 8,
                strengths: [],
                improvements: [],
            },
        })

        const { analyzeAgentPerformance } = await import('./agent-qa')
        const result = await analyzeAgentPerformance('agent-1', 25)

        expect(result).toEqual({
            success: true,
            report: expect.objectContaining({ overallScore: 8 }),
            messagesAnalyzed: 5,
        })
        expect(messagesQuery.eq).toHaveBeenCalledWith('direction', 'outbound')
        expect(messagesQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(reportInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            agent_id: 'agent-1',
            messages_analyzed_count: 5,
        }))
        expect(mocks.executeTask).toHaveBeenCalledWith(expect.objectContaining({
            organizationId: 'org-current',
            taskType: 'analytics.agent_qa_v1',
        }))
    })

    it('does not expose QA message fetch failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.supabaseAdminFrom.mockReturnValue(makeCacheQuery({ data: null }))
        const messagesQuery = makeMessagesQuery({
            data: null,
            error: {
                message: 'database password secret-value failed reading agent-secret-id messages',
                code: '42501',
            },
        })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => messagesQuery),
        })

        const { analyzeAgentPerformance } = await import('./agent-qa')
        const result = await analyzeAgentPerformance('agent-secret-id', 25)

        expect(result).toEqual({
            success: false,
            error: 'Agent QA failed',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('agent-secret-id')
        expect(logText).not.toContain('database password')
    })
})
