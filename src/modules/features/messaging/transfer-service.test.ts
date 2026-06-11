import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getDictionary: vi.fn(),
    resolveLanguage: vi.fn(),
    revalidatePath: vi.fn(),
    supabaseAdminFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseAdminFrom,
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/core/i18n/dictionaries', () => ({
    getDictionary: mocks.getDictionary,
}))

vi.mock('@/modules/core/i18n', () => ({
    resolveLanguage: mocks.resolveLanguage,
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

function updateQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return {
        update: vi.fn(() => query),
        __query: query,
    }
}

function listQuery(result: unknown) {
    const query: any = {
        in: vi.fn(() => query),
        select: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return query
}

function insertQuery(capture: { insert?: any }) {
    return {
        insert: vi.fn(async (payload: any) => {
            capture.insert = payload
            return { error: null }
        }),
    }
}

function accessQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        limit: vi.fn(async () => result),
        or: vi.fn(() => query),
        select: vi.fn(() => query),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.getDictionary.mockReset()
    mocks.resolveLanguage.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.supabaseAdminFrom.mockReset()
})

describe('transfer service logging', () => {
    it('does not expose transfer update failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseAdminFrom
            .mockReturnValueOnce(singleQuery({
                data: {
                    assigned_to: 'from-agent-secret-id',
                    channel: 'whatsapp',
                    connection_id: 'connection-secret-id',
                    organization_id: 'org-secret-id',
                },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: {
                    current_load: 1,
                    max_capacity: 10,
                    status: 'online',
                },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: { role: 'admin' },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: { role: 'admin' },
                error: null,
            }))
            .mockReturnValueOnce(updateQuery({
                error: {
                    code: '42501',
                    message: 'policy denied conversation-secret-id org-secret-id to-agent-secret-id',
                },
            }))

        const { transferConversation } = await import('./transfer-service')
        const result = await transferConversation('conversation-secret-id', 'from-agent-secret-id', 'to-agent-secret-id', 'manual reason')

        expect(result).toEqual({ success: false, error: 'Conversation transfer failed' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('from-agent-secret-id')
        expect(logText).not.toContain('to-agent-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('policy denied')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('fromAgentIdPresent')
        expect(logText).toContain('toAgentIdPresent')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('connectionIdPresent')
        expect(logText).toContain('42501')
    })

    it('rejects target agents outside the conversation organization', async () => {
        const update = updateQuery({ error: null })
        const agentAvailability = singleQuery({
            data: {
                current_load: 1,
                max_capacity: 10,
                status: 'online',
            },
            error: null,
        })
        mocks.supabaseAdminFrom
            .mockReturnValueOnce(singleQuery({
                data: {
                    assigned_to: 'from-agent',
                    channel: 'whatsapp',
                    connection_id: 'connection-1',
                    organization_id: 'org-current',
                },
                error: null,
            }))
            .mockReturnValueOnce(agentAvailability)
            .mockReturnValueOnce(singleQuery({
                data: null,
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: { role: 'admin' },
                error: null,
            }))
            .mockReturnValueOnce(update)

        const { transferConversation } = await import('./transfer-service')
        const result = await transferConversation('conversation-1', 'from-agent', 'foreign-agent')

        expect(result).toEqual({ success: false, error: 'Target agent profile or member record not found' })
        expect(agentAvailability.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(agentAvailability.eq).toHaveBeenCalledWith('agent_id', 'foreign-agent')
        expect(update.update).not.toHaveBeenCalled()
    })

    it('rejects non-admin targets without active channel access', async () => {
        const channelAccess = accessQuery({ data: [], error: null })
        const update = updateQuery({ error: null })
        mocks.supabaseAdminFrom
            .mockReturnValueOnce(singleQuery({
                data: {
                    assigned_to: 'from-agent',
                    channel: 'whatsapp',
                    connection_id: 'connection-1',
                    organization_id: 'org-current',
                },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: {
                    current_load: 1,
                    max_capacity: 10,
                    status: 'online',
                },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: { role: 'member' },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: { role: 'admin' },
                error: null,
            }))
            .mockReturnValueOnce(channelAccess)
            .mockReturnValueOnce(update)

        const { transferConversation } = await import('./transfer-service')
        const result = await transferConversation('conversation-1', 'from-agent', 'target-agent')

        expect(result).toEqual({ success: false, error: 'Target agent does not have access to this channel' })
        expect(channelAccess.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(channelAccess.eq).toHaveBeenCalledWith('agent_id', 'target-agent')
        expect(channelAccess.in).toHaveBeenCalledWith('channel_type', ['whatsapp', 'connection-1'])
        expect(channelAccess.eq).toHaveBeenCalledWith('is_active', true)
        expect(update.update).not.toHaveBeenCalled()
    })

    it('persists transfer system messages with the conversation organization', async () => {
        mocks.resolveLanguage.mockResolvedValue('en')
        mocks.getDictionary.mockReturnValue({
            crm: {
                inbox: {
                    chat: {
                        system: {
                            transfer_reason: ' Reason: {reason}',
                            transferred: '{from} transferred to {to}.{reason}',
                        },
                    },
                },
            },
        })

        const update = updateQuery({ error: null })
        const messageCapture: { insert?: any } = {}
        mocks.supabaseAdminFrom
            .mockReturnValueOnce(singleQuery({
                data: {
                    assigned_to: null,
                    channel: 'whatsapp',
                    connection_id: 'connection-current',
                    organization_id: 'org-current',
                },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: {
                    current_load: 1,
                    max_capacity: 10,
                    status: 'online',
                },
                error: null,
            }))
            .mockReturnValueOnce(singleQuery({
                data: { role: 'admin' },
                error: null,
            }))
            .mockReturnValueOnce(update)
            .mockReturnValueOnce(listQuery({
                data: [{ id: 'target-agent', full_name: 'Target Agent' }],
                error: null,
            }))
            .mockReturnValueOnce(insertQuery(messageCapture))

        const { transferConversation } = await import('./transfer-service')
        const result = await transferConversation('conversation-current', null, 'target-agent', 'handoff')

        expect(result).toEqual({ success: true })
        expect(update.__query.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(update.__query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(messageCapture.insert).toMatchObject({
            conversation_id: 'conversation-current',
            organization_id: 'org-current',
            channel: 'whatsapp',
            sender: 'System',
            metadata: {
                transfer: true,
                fromAgentId: null,
                toAgentId: 'target-agent',
                reason: 'handoff',
            },
        })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm/inbox')
    })
})
