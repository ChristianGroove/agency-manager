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
        in: vi.fn(() => query),
        or: vi.fn(() => query),
        insert: vi.fn(async () => result),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        single: vi.fn(async () => result),
        maybeSingle: vi.fn(async () => result),
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

describe('Assignment Fallback Logic (JS Layer)', () => {
    it('applies round robin constraints (5m heartbeat) even for a single specific agent (bypass fix)', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        
        // Mock RPC to fail, forcing JS fallback
        mocks.supabaseRpc.mockResolvedValue({ data: null, error: new Error('RPC Failed') })
        
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                return supabaseQuery({
                    data: {
                        id: 'conversation-123',
                        assigned_to: null,
                        organization_id: 'org-123',
                        channel: 'whatsapp',
                        connection_id: 'conn-123',
                        leads: {},
                    },
                    error: null,
                })
            }

            if (table === 'assignment_rules') {
                return supabaseQuery({
                    data: [{
                        id: 'rule-1',
                        strategy: 'specific-agent',
                        assign_to: ['agent-offline'],
                        conditions: {}
                    }],
                    error: null
                })
            }

            if (table === 'agent_availability') {
                // Return an agent whose heartbeat is 10 minutes old!
                const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
                return supabaseQuery({
                    data: [{
                        agent_id: 'agent-offline',
                        status: 'online',
                        auto_assign_enabled: true,
                        last_seen_at: tenMinsAgo,
                        organization_id: 'org-123'
                    }],
                    error: null
                })
            }
            
            if (table === 'assignment_history') return supabaseQuery({ data: null, error: null })
            if (table === 'agent_channels') return supabaseQuery({ data: [], error: null })
            if (table === 'organization_members') {
                return supabaseQuery({
                    data: [{ user_id: 'agent-offline', role: 'admin' }],
                    error: null
                })
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { assignConversation } = await import('./assignment-engine')
        const result = await assignConversation('conversation-123')

        // Because of the Specific Agent bypass fix and 5m heartbeat check, 
        // it should NOT assign to 'agent-offline'. It should return null.
        expect(result).toBeNull()
    })

    it('falls back to the next agent alphabetically when the last assigned agent goes offline', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.supabaseRpc.mockResolvedValue({ data: null, error: new Error('RPC Failed') })
        
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                return supabaseQuery({
                    data: {
                        id: 'conversation-123',
                        organization_id: 'org-123',
                        channel: 'whatsapp',
                        connection_id: 'conn-123',
                        leads: {}
                    },
                    error: null,
                })
            }

            if (table === 'assignment_rules') {
                return supabaseQuery({
                    data: [{
                        id: 'rule-rr',
                        strategy: 'round-robin',
                        assign_to: ['agent-A', 'agent-B', 'agent-C'],
                        conditions: {}
                    }],
                    error: null
                })
            }

            if (table === 'assignment_history') {
                // The last agent assigned was 'agent-B'
                return supabaseQuery({
                    data: { assigned_to: 'agent-B' },
                    error: null
                })
            }

            if (table === 'agent_availability') {
                // 'agent-B' is offline (not returned), but 'agent-A' and 'agent-C' are online.
                const recentHeartbeat = new Date(Date.now() - 1 * 60 * 1000).toISOString()
                return supabaseQuery({
                    data: [
                        { agent_id: 'agent-A', last_seen_at: recentHeartbeat, status: 'online', auto_assign_enabled: true },
                        { agent_id: 'agent-C', last_seen_at: recentHeartbeat, status: 'online', auto_assign_enabled: true }
                    ],
                    error: null
                })
            }
            
            if (table === 'agent_channels') return supabaseQuery({ data: [], error: null })
            if (table === 'organization_members') {
                return supabaseQuery({
                    data: [
                        { user_id: 'agent-A', role: 'admin' },
                        { user_id: 'agent-C', role: 'admin' }
                    ],
                    error: null
                })
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { assignConversation } = await import('./assignment-engine')
        const result = await assignConversation('conversation-123')

        // The fallback logic should see that B is missing, and instead of resetting to A (index 0),
        // it should find the next agent alphabetically after B, which is C!
        expect(result).toBe('agent-C')
    })
})
