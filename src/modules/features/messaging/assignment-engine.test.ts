import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
    supabaseRpc: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.supabaseFrom,
        rpc: mocks.supabaseRpc,
    }))
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

function supabaseQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        insert: vi.fn(async () => result),
        order: vi.fn(() => query),
        single: vi.fn(async () => result),
        update: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.supabaseFrom.mockReset()
    mocks.supabaseRpc.mockReset()
})

describe('AssignmentEngine', () => {
    it('does not expose assignment ids in production success logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.supabaseRpc.mockResolvedValue({ data: 'agent-secret-id', error: null })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                return supabaseQuery({
                    data: {
                        id: 'conversation-secret-id',
                        assigned_to: null,
                        organization_id: 'org-secret-id',
                        channel: 'whatsapp',
                        connection_id: 'connection-secret-id',
                        leads: {},
                    },
                    error: null,
                })
            }

            if (table === 'assignment_rules') return supabaseQuery({ data: [], error: null })
            if (table === 'assignment_history') return supabaseQuery({ error: null })
            throw new Error(`Unexpected table ${table}`)
        })

        const { assignConversation } = await import('./assignment-engine')
        const result = await assignConversation('conversation-secret-id')

        expect(result).toBe('agent-secret-id')
        expect(mocks.supabaseRpc).toHaveBeenCalledWith('fn_get_next_agent_atomic', expect.objectContaining({
            p_org_id: 'org-secret-id',
            p_connection_id: 'connection-secret-id',
        }))

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('agent-secret-id')
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).toContain('agentIdPresent')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('organizationIdPresent')
    })

    it('does not expose assignment history failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'assignment_history') {
                return supabaseQuery({
                    error: {
                        code: '23503',
                        message: 'conversation-secret-id agent-secret-id org-secret-id foreign key failed',
                    },
                })
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { logAssignment } = await import('./assignment-engine')
        await logAssignment(
            'conversation-secret-id',
            'agent-secret-id',
            'rule-secret-id',
            'round-robin',
            'org-secret-id'
        )

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('agent-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('rule-secret-id')
        expect(logText).not.toContain('foreign key failed')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('agentIdPresent')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('23503')
    })
})
