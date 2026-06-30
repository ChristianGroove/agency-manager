/* eslint-disable @typescript-eslint/no-explicit-any */
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

vi.mock('@/modules/core/database/supabase-admin', () => {
    const fromMock = vi.fn((table: string) => {
        const builder: any = {
            methods: [] as Array<{ name: string; args: any[] }>,
            then(onFulfilled: any, onRejected: any) {
                return mocks.createClient()
                    .then((client: any) => {
                        if (client && typeof client.from === 'function') {
                            let query: any = client.from(table);
                            for (const methodCall of builder.methods) {
                                if (typeof query[methodCall.name] === 'function') {
                                    query = query[methodCall.name](...methodCall.args);
                                }
                            }
                            return query;
                        }
                        return { data: null, error: null };
                    })
                    .then(onFulfilled, onRejected);
            }
        };

        const chainableMethods = [
            'select', 'insert', 'update', 'delete', 'upsert',
            'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike',
            'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte',
            'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps',
            'textSearch', 'match', 'not', 'or', 'filter', 'order',
            'limit', 'range', 'single', 'maybeSingle', 'csv'
        ];

        chainableMethods.forEach(method => {
            builder[method] = vi.fn((...args: any[]) => {
                builder.methods.push({ name: method, args });
                return builder;
            });
        });

        return builder;
    });

    return {
        supabaseAdmin: {
            from: fromMock,
        }
    };
})



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
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'agent_qa_reports') {
                    return makeCacheQuery({
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
                    })
                }
                throw new Error(`Unexpected table ${table}`)
            })
        })

        const { analyzeAgentPerformance } = await import('./agent-qa')
        const result = await analyzeAgentPerformance('agent-1', 25)

        expect(result).toEqual({
            success: true,
            report: expect.objectContaining({ overallScore: 8.6 }),
            messagesAnalyzed: 12,
        })
        expect(mocks.executeTask).not.toHaveBeenCalled()
    })

    it('does not expose QA message fetch failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const messagesQuery = makeMessagesQuery({
            data: null,
            error: {
                message: 'database password secret-value failed reading agent-secret-id messages',
                code: '42501',
            },
        })
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'agent_qa_reports') {
                    return makeCacheQuery({ data: null })
                }
                if (table === 'messages') {
                    return messagesQuery
                }
                throw new Error(`Unexpected table ${table}`)
            }),
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
