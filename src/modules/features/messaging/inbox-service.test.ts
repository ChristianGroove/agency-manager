import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IncomingMessage } from './providers/types'

const mocks = vi.hoisted(() => ({
    evaluateInput: vi.fn(),
    handleLeadIncomingActivity: vi.fn(),
    isOnline: vi.fn(),
    resolveConnection: vi.fn(),
    sendOutboundMessage: vi.fn(),
}))

vi.mock('@/modules/features/crm/services/logic/lead-lifecycle-manager', () => ({
    LeadLifecycleManager: vi.fn(function () {
        return {
            handleLeadIncomingActivity: mocks.handleLeadIncomingActivity,
        }
    }),
}))

vi.mock('@/modules/features/messaging/business-hours', () => ({
    BusinessHoursEngine: {
        isOnline: mocks.isOnline,
    },
}))

vi.mock('@/modules/features/messaging/channel-resolver', () => ({
    ChannelResolver: {
        resolveConnection: mocks.resolveConnection,
    },
}))

vi.mock('@/modules/features/messaging/outbound-service', () => ({
    outboundService: {
        sendMessage: mocks.sendOutboundMessage,
    },
}))

vi.mock('../automation/automation-trigger.service', () => ({
    automationTrigger: {
        evaluateInput: mocks.evaluateInput,
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

function incomingMessage(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
    return {
        channel: 'whatsapp',
        content: 'hola',
        from: '+571234567890',
        metadata: {
            phoneNumberId: 'phone-secret',
            raw: 'metadata-secret',
        },
        timestamp: new Date('2026-06-10T15:00:00.000Z'),
        ...overrides,
    } as IncomingMessage
}

function duplicateMessageSupabase() {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => ({
            data: {
                conversation_id: 'conversation-secret-id',
                conversations: {
                    lead_id: 'lead-secret-id',
                },
            },
            error: null,
        })),
    }

    return {
        from: vi.fn(() => builder),
    } as any
}

function chainQuery(result: unknown = { data: null, error: null }) {
    const query: any = {
        eq: vi.fn(() => query),
        insert: vi.fn(() => query),
        is: vi.fn(() => query),
        limit: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
        update: vi.fn(() => query),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.evaluateInput.mockReset()
    mocks.handleLeadIncomingActivity.mockReset()
    mocks.isOnline.mockReset()
    mocks.resolveConnection.mockReset()
    mocks.sendOutboundMessage.mockReset()
})

describe('InboxService', () => {
    it('does not expose unmatched inbound message details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.resolveConnection.mockResolvedValue(null)

        const { InboxService } = await import('./inbox-service')
        const result = await new InboxService().handleIncomingMessage(
            incomingMessage(),
            { from: vi.fn() } as any
        )

        expect(result).toEqual({
            success: false,
            error: 'Tenant isolation: No matching connection',
        })

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('+571234567890')
        expect(logText).not.toContain('phone-secret')
        expect(logText).not.toContain('metadata-secret')
        expect(logText).toContain('fromPresent')
        expect(logText).toContain('metadataPresent')
    })

    it('does not expose duplicate external ids in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const { InboxService } = await import('./inbox-service')
        const result = await new InboxService().handleIncomingMessage(
            incomingMessage({ externalId: 'external-secret-id' }),
            duplicateMessageSupabase()
        )

        expect(result).toEqual({
            success: true,
            conversationId: 'conversation-secret-id',
        })
        expect(mocks.resolveConnection).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('external-secret-id')
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).toContain('externalIdPresent')
    })

    it('scopes inbound conversation updates and offline auto-reply rate limits to the matched organization', async () => {
        mocks.resolveConnection.mockResolvedValue({
            connectionId: 'connection-current',
            organizationId: 'org-current',
            connection: {
                id: 'connection-current',
                auto_reply_when_offline: 'Estamos fuera de horario',
                working_hours: {},
            },
        })
        mocks.isOnline.mockReturnValue(false)
        mocks.sendOutboundMessage.mockResolvedValue({ messageId: 'auto-reply-message' })
        mocks.evaluateInput.mockResolvedValue(undefined)
        mocks.handleLeadIncomingActivity.mockResolvedValue(undefined)

        const leadsQuery = chainQuery({
            data: [{ id: 'lead-current', phone: '571234567890', name: 'Client Current' }],
            error: null,
        })
        const conversationLookup = chainQuery({
            data: [{
                id: 'conversation-current',
                channel: 'whatsapp',
                connection_id: 'connection-current',
                lead_id: 'lead-current',
                metadata: {},
                organization_id: 'org-current',
                state: 'active',
            }],
            error: null,
        })
        const conversationUpdate = chainQuery({ data: null, error: null })
        const messageInsert = chainQuery({ data: { id: 'message-current' }, error: null })
        const autoReplyLookup = chainQuery({
            data: { last_auto_reply_at: null },
            error: null,
        })
        const autoReplyUpdate = chainQuery({ data: null, error: null })

        let conversationCalls = 0
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === 'leads') return leadsQuery
                if (table === 'messages') return messageInsert
                if (table === 'conversations') {
                    conversationCalls += 1
                    if (conversationCalls === 1) return conversationLookup
                    if (conversationCalls === 2) return conversationUpdate
                    if (conversationCalls === 3) return autoReplyLookup
                    if (conversationCalls === 4) return autoReplyUpdate
                }
                throw new Error(`Unexpected table ${table}`)
            }),
        } as any

        const { InboxService } = await import('./inbox-service')
        const result = await new InboxService().handleIncomingMessage(
            incomingMessage({ from: '+57 123 456 7890' }),
            supabase
        )

        expect(result).toEqual({ success: true, conversationId: 'conversation-current' })
        expect(conversationLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationUpdate.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(conversationUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(autoReplyLookup.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(autoReplyLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(autoReplyUpdate.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(autoReplyUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(messageInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            conversation_id: 'conversation-current',
            organization_id: 'org-current',
        }))
        expect(mocks.sendOutboundMessage).toHaveBeenCalledWith(
            'connection-current',
            '+57 123 456 7890',
            'Estamos fuera de horario',
            'org-current',
            expect.any(Object)
        )
        expect(mocks.evaluateInput).toHaveBeenCalledWith(
            'hola',
            'conversation-current',
            'whatsapp',
            '+57 123 456 7890',
            'lead-current',
            'connection-current',
            undefined,
            'org-current'
        )
    })
})
