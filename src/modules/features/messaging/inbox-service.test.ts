import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IncomingMessage } from './providers/types'

const mocks = vi.hoisted(() => ({
    resolveConnection: vi.fn(),
    incomingActivity: vi.fn(async () => undefined),
}))

vi.mock('@/modules/features/crm/services/logic/lead-lifecycle-manager', () => ({
    LeadLifecycleManager: class { handleLeadIncomingActivity = mocks.incomingActivity },
}))

vi.mock('@/modules/features/messaging/channel-resolver', () => ({
    ChannelResolver: {
        resolveConnection: mocks.resolveConnection,
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.resolveConnection.mockReset()
})

describe('InboxService', () => {
    it('preserves reception and existing automations when post-persist opt-out processing fails', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.resolveConnection.mockResolvedValue({ connectionId: 'connection', organizationId: 'org', connection: {} })
        const inserted = vi.fn()
        const query: any = {
            select: () => query, eq: () => query,
            maybeSingle: async () => ({ data: null, error: null }),
            insert: (row: any) => { inserted(row); return query },
            single: async () => ({ data: { id: 'persisted-message' }, error: null }),
        }
        const rpc = vi.fn().mockRejectedValue(new Error('temporary preference failure'))
        const { InboxService } = await import('./inbox-service')
        const service = new InboxService()
        vi.spyOn(service as any, 'resolveMetadataContext').mockResolvedValue({
            conversation: { id: 'conversation' }, lead: { id: 'lead' }, isNewLead: false,
        })
        const connectionAutomation = vi.spyOn(service as any, 'handleConnectionAutomation').mockResolvedValue(undefined)
        const workflowAutomation = vi.spyOn(service as any, 'triggerAutomation').mockResolvedValue(undefined)
        const result = await service.handleIncomingMessage(incomingMessage({ content: { type: 'text', text: 'STOP' }, externalId: 'wamid.fixture' }),
            { from: () => query, rpc } as any)
        expect(result).toEqual({ success: true, conversationId: 'conversation' })
        expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ direction: 'inbound', status: 'received', content: { type: 'text', text: 'STOP' } }))
        expect(rpc).toHaveBeenCalledWith('process_marketing_opt_out_requests', { p_limit: 1, p_message: 'persisted-message' })
        expect(connectionAutomation).toHaveBeenCalledOnce()
        expect(workflowAutomation).toHaveBeenCalledOnce()
        expect(mocks.incomingActivity).toHaveBeenCalledWith('lead', 'org')
    })

    it.each(['WhatsApp User', '573001234567', '', null])('enriches placeholder name %s within its tenant without changing lead status', async name => {
        const updates: any[] = []
        const filters: any[] = []
        const client: any = { from: (table: string) => {
            const query: any = {
                select: () => query, order: () => query, is: (key: string, value: any) => { filters.push([table, key, value]); return query },
                eq: (key: string, value: any) => { filters.push([table, key, value]); return query },
                update: (value: any) => { updates.push([table, value]); query.updated = true; return query },
                limit: () => query,
                then: (resolve: any) => Promise.resolve({ data: query.updated ? null : table === 'leads'
                    ? [{ id: 'lead', name, phone: '573001234567' }]
                    : [{ id: 'conversation', state: 'active', metadata: {}, last_message_at: '2026-06-10T15:00:00Z' }], error: null }).then(resolve),
            }
            return query
        } }
        const { InboxService } = await import('./inbox-service')
        await (new InboxService() as any).resolveMetadataContext(incomingMessage({ from: '573001234567', senderName: 'Ana' }),
            { organizationId: 'tenant', connectionId: 'connection' }, client)
        expect(updates.filter(([table]) => table === 'leads')).toEqual([['leads', { name: 'Ana' }]])
        expect(filters).toContainEqual(['leads', 'organization_id', 'tenant'])
        expect(filters).toContainEqual(['leads', 'name', name])
        expect(updates.every(([, update]) => !('status' in update))).toBe(true)
    })
    it.each(['Ana CRM', 'Cliente 573001234567'])('preserves a curated contact name %s', async name => {
        const updateLead = vi.fn()
        const client: any = { from: (table: string) => {
            const query: any = { select: () => query, eq: () => query, order: () => query, limit: () => query,
                update: (value: any) => { if (table === 'leads') updateLead(value); query.updated = true; return query },
                then: (resolve: any) => Promise.resolve({ data: query.updated ? null : table === 'leads'
                    ? [{ id: 'lead', name, phone: '573001234567' }]
                    : [{ id: 'conversation', state: 'active', metadata: {} }], error: null }).then(resolve) }
            return query
        } }
        const { InboxService } = await import('./inbox-service')
        await (new InboxService() as any).resolveMetadataContext(incomingMessage({ from: '573001234567', senderName: 'Ana Meta' }),
            { organizationId: 'tenant', connectionId: 'connection' }, client)
        expect(updateLead).not.toHaveBeenCalled()
    })
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

        mocks.resolveConnection.mockResolvedValue({connectionId:'connection',organizationId:'org',connection:{}})
        const { InboxService } = await import('./inbox-service')
        const result = await new InboxService().handleIncomingMessage(
            incomingMessage({ externalId: 'external-secret-id' }),
            duplicateMessageSupabase()
        )

        expect(result).toEqual({
            success: true,
            conversationId: 'conversation-secret-id',
        })
        expect(mocks.resolveConnection).toHaveBeenCalled()

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('external-secret-id')
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).toContain('externalIdPresent')
    })
})
