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

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseAdminFrom,
    },
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

            throw new Error(`Unexpected table ${table}`)
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
})
