import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
    supabaseRpc: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
        rpc: mocks.supabaseRpc,
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

function supabaseQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        insert: vi.fn(async () => result),
        limit: vi.fn(() => query),
        or: vi.fn(() => query),
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
        const conversationRead = supabaseQuery({
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
        const conversationUpdate = supabaseQuery({ error: null })
        let conversationCalls = 0
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                conversationCalls += 1
                return conversationCalls === 1 ? conversationRead : conversationUpdate
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
        expect(conversationUpdate.eq).toHaveBeenCalledWith('id', 'conversation-secret-id')
        expect(conversationUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-secret-id')

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

    it('scopes agent load reconciliation to the organization', async () => {
        const conversationsCount = supabaseQuery({ count: 3, error: null })
        const agentRead = supabaseQuery({ data: { current_load: 1 }, error: null })
        const agentUpdate = supabaseQuery({ error: null })
        let availabilityCalls = 0

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') return conversationsCount
            if (table === 'agent_availability') {
                availabilityCalls += 1
                return availabilityCalls === 1 ? agentRead : agentUpdate
            }
            throw new Error(`Unexpected table ${table}`)
        })

        const { reconcileAgentLoad } = await import('./assignment-engine')
        const result = await reconcileAgentLoad('agent-1', 'org-current')

        expect(result).toEqual({ previous: 1, actual: 3 })
        expect(conversationsCount.eq).toHaveBeenCalledWith('assigned_to', 'agent-1')
        expect(conversationsCount.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(agentRead.eq).toHaveBeenCalledWith('agent_id', 'agent-1')
        expect(agentRead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(agentUpdate.eq).toHaveBeenCalledWith('agent_id', 'agent-1')
        expect(agentUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes skills-based assignment lookups to the conversation organization', async () => {
        const conversationRead = supabaseQuery({
            data: {
                id: 'conversation-1',
                assigned_to: null,
                organization_id: 'org-current',
                channel: 'whatsapp',
                connection_id: 'connection-1',
                tags: ['billing'],
                leads: {},
            },
            error: null,
        })
        const conversationUpdate = supabaseQuery({ error: null })
        const rulesQuery = supabaseQuery({
            data: [{
                id: 'rule-1',
                name: 'Skills',
                strategy: 'skills-based',
                conditions: {},
                assign_to: [],
            }],
            error: null,
        })
        const skillsQuery = supabaseQuery({
            data: [{ agent_id: 'agent-1', skill: 'billing', proficiency: 5 }],
            error: null,
        })
        const membersQuery = supabaseQuery({
            data: [{ user_id: 'agent-1', role: 'member', permissions: {} }],
            error: null,
        })
        const channelQuery = supabaseQuery({
            data: [{ agent_id: 'agent-1' }],
            error: null,
        })
        const availabilityQuery = supabaseQuery({
            data: {
                agent_id: 'agent-1',
                current_load: 1,
                max_capacity: 5,
                last_seen_at: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
        })
        const historyQuery = supabaseQuery({ error: null })
        let conversationCalls = 0

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                conversationCalls += 1
                return conversationCalls === 1 ? conversationRead : conversationUpdate
            }
            if (table === 'assignment_rules') return rulesQuery
            if (table === 'agent_skills') return skillsQuery
            if (table === 'organization_members') return membersQuery
            if (table === 'agent_channels') return channelQuery
            if (table === 'agent_availability') return availabilityQuery
            if (table === 'assignment_history') return historyQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { assignConversation } = await import('./assignment-engine')
        const result = await assignConversation('conversation-1')

        expect(result).toBe('agent-1')
        expect(skillsQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(membersQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(channelQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(channelQuery.in).toHaveBeenCalledWith('channel_type', ['whatsapp', 'connection-1'])
        expect(availabilityQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes fallback load-balance channel lookup to the organization', async () => {
        mocks.supabaseRpc.mockResolvedValue({ data: null, error: null })
        const conversationRead = supabaseQuery({
            data: {
                id: 'conversation-1',
                assigned_to: null,
                organization_id: 'org-current',
                channel: 'whatsapp',
                connection_id: 'connection-1',
                tags: [],
                leads: {},
            },
            error: null,
        })
        const conversationUpdate = supabaseQuery({ error: null })
        const rulesQuery = supabaseQuery({ data: [], error: null })
        const availabilityQuery = supabaseQuery({
            data: [{
                agent_id: 'agent-1',
                current_load: 1,
                max_capacity: 5,
                status: 'online',
                organization_id: 'org-current',
                last_seen_at: new Date(Date.now() + 60_000).toISOString(),
            }],
            error: null,
        })
        const membersQuery = supabaseQuery({
            data: [{ user_id: 'agent-1', role: 'member', permissions: {} }],
            error: null,
        })
        const channelQuery = supabaseQuery({
            data: [{ agent_id: 'agent-1' }],
            error: null,
        })
        const historyQuery = supabaseQuery({ error: null })
        let conversationCalls = 0

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                conversationCalls += 1
                return conversationCalls === 1 ? conversationRead : conversationUpdate
            }
            if (table === 'assignment_rules') return rulesQuery
            if (table === 'agent_availability') return availabilityQuery
            if (table === 'organization_members') return membersQuery
            if (table === 'agent_channels') return channelQuery
            if (table === 'assignment_history') return historyQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { assignConversation } = await import('./assignment-engine')
        const result = await assignConversation('conversation-1')

        expect(result).toBe('agent-1')
        expect(channelQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(channelQuery.in).toHaveBeenCalledWith('channel_type', ['whatsapp', 'connection-1'])
        expect(conversationUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
