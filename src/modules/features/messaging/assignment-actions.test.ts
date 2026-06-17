import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    assignConversation: vi.fn(),
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    logAssignment: vi.fn(),
    revalidatePath: vi.fn(),
    supabaseAdminFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))



vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('./assignment-engine', () => ({
    assignConversation: mocks.assignConversation,
    logAssignment: mocks.logAssignment,
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

function authClient(userId = 'user-secret-id') {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: userId } } })),
        },
        from: vi.fn((table: string) => {
            if (table === 'organization_members') {
                return memberQuery({
                    data: { organization_id: 'org-secret-id' },
                    error: null,
                })
            }

            return mocks.supabaseAdminFrom(table)
        }),
    }
}

function memberQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        limit: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function maybeSingleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function updateTwoEqQuery(result: unknown) {
    let eqCalls = 0
    const query: any = {
        eq: vi.fn(() => {
            eqCalls += 1
            return eqCalls < 2 ? query : Promise.resolve(result)
        }),
    }

    return {
        update: vi.fn(() => query),
    }
}

function orderQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        order: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function eqQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function upsertSingleQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return {
        upsert: vi.fn(() => query),
    }
}

function awaitableQuery(result: unknown) {
    const promise = Promise.resolve(result)
    const query: any = {
        eq: vi.fn(() => query),
        gt: vi.fn(() => query),
        in: vi.fn(() => query),
        is: vi.fn(() => query),
        select: vi.fn(() => query),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.assignConversation.mockReset()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.logAssignment.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.supabaseAdminFrom.mockReset()
})

describe('assignment actions logging', () => {
    it('does not expose agent status database failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())
        mocks.supabaseAdminFrom
            .mockReturnValueOnce(maybeSingleQuery({
                data: { agent_id: 'user-secret-id' },
                error: null,
            }))
            .mockReturnValueOnce(updateTwoEqQuery({
                error: {
                    code: '42501',
                    message: 'policy denied user-secret-id org-secret-id',
                },
            }))

        const { updateAgentStatus } = await import('./assignment-actions')
        const result = await updateAgentStatus('online')

        expect(result).toEqual({ success: false, error: 'Assignment action failed' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('policy denied')
        expect(logText).toContain('userIdPresent')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('42501')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose workload fetch failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())
        mocks.supabaseAdminFrom
            .mockReturnValueOnce(orderQuery({
                data: null,
                error: {
                    code: 'PGRST123',
                    message: 'workload denied org-secret-id user-secret-id',
                },
            }))
            .mockReturnValueOnce(eqQuery({
                data: [],
                error: null,
            }))

        const { getAgentsWorkload } = await import('./assignment-actions')
        const result = await getAgentsWorkload()

        expect(result).toEqual({ success: false, error: 'Assignment action failed', data: [] })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('workload denied')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('PGRST123')
    })

    it('does not expose assignment rule save failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.supabaseAdminFrom.mockReturnValueOnce(upsertSingleQuery({
            data: null,
            error: {
                code: '42501',
                message: 'rule-secret-id denied for org-secret-id user-secret-id connection-secret-id',
            },
        }))

        const { upsertAssignmentRule } = await import('./assignment-actions')
        const result = await upsertAssignmentRule({
            id: 'rule-secret-id',
            name: 'VIP routing',
            priority: 1,
            conditions: { connection_id: ['connection-secret-id'] },
            strategy: 'round_robin',
        })

        expect(result).toEqual({ success: false, error: 'Assignment action failed' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('rule-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('denied')
        expect(logText).toContain('ruleIdPresent')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('userIdPresent')
        expect(logText).toContain('42501')
    })

    it('does not expose bulk distribution query failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.supabaseAdminFrom.mockReturnValueOnce(awaitableQuery({
            data: null,
            error: {
                code: '42501',
                message: 'conversation-secret-id connection-secret-id denied for org-secret-id',
            },
        }))

        const { distributeUnassignedConversations } = await import('./assignment-actions')
        const result = await distributeUnassignedConversations(['connection-secret-id'])

        expect(result).toEqual({ success: false, error: 'Assignment action failed' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('denied')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('targetConnectionIdsCount')
        expect(logText).toContain('42501')
    })
})
