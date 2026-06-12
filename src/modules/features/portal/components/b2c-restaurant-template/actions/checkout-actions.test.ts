import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    rpc: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
        rpc: mocks.rpc,
    },
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

function query(result: { data?: unknown; error?: unknown }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.or = vi.fn(() => chain)
    chain.in = vi.fn(() => chain)
    chain.is = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.maybeSingle = vi.fn(async () => result)
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    return chain
}

function useTableQueues(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.from.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) throw new Error(`Unexpected table ${table}`)
        return queue.shift()
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.from.mockReset()
    mocks.rpc.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('B2C restaurant checkout tenant safety', () => {
    it('verifies the portal token before updating a client address', async () => {
        const clientLookup = query({
            data: { id: 'client-current', organization_id: 'org-current' },
            error: null,
        })
        const addressUpdate = query({ data: null, error: null })
        useTableQueues({
            leads: [clientLookup, addressUpdate],
        })

        const { updateClientAddress } = await import('./checkout-actions')
        const result = await updateClientAddress('short-token', 'client-current', 'New address')

        expect(result).toEqual({ success: true })
        expect(clientLookup.eq).toHaveBeenCalledWith('portal_short_token', 'short-token')
        expect(addressUpdate.update).toHaveBeenCalledWith({ address: 'New address' })
        expect(addressUpdate.eq).toHaveBeenCalledWith('id', 'client-current')
        expect(addressUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/')
    })

    it('does not update a client address when the token belongs to a different client', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const clientLookup = query({
            data: { id: 'client-other', organization_id: 'org-current' },
            error: null,
        })
        useTableQueues({
            leads: [clientLookup],
        })

        const { updateClientAddress } = await import('./checkout-actions')
        const result = await updateClientAddress('short-token', 'client-current', 'New address')

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.from).toHaveBeenCalledTimes(1)
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalled()
    })

    it('scopes order status updates to the authenticated organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const messageLookup = query({
            data: { metadata: { type: 'resto_order', total: 1000 } },
            error: null,
        })
        const messageUpdate = query({ data: null, error: null })
        useTableQueues({
            messages: [messageLookup, messageUpdate],
        })

        const { updateRestoOrderStatus } = await import('./checkout-actions')
        const result = await updateRestoOrderStatus('message-current', 'shipped')

        expect(result).toEqual({ success: true })
        expect(messageLookup.eq).toHaveBeenCalledWith('id', 'message-current')
        expect(messageLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(messageUpdate.update).toHaveBeenCalledWith({
            status: 'read',
            metadata: { type: 'resto_order', total: 1000, order_status: 'shipped' },
        })
        expect(messageUpdate.eq).toHaveBeenCalledWith('id', 'message-current')
        expect(messageUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('fails closed when order status updates have no active organization', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { updateRestoOrderStatus } = await import('./checkout-actions')
        const result = await updateRestoOrderStatus('message-current', 'shipped')

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.from).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalled()
    })

    it('keeps existing checkout writes scoped to the payload organization', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const connectionLookup = query({
            data: { id: 'connection-current' },
            error: null,
        })
        const conversationLookup = query({
            data: [{
                id: 'conversation-current',
                connection_id: 'connection-current',
                client_id: null,
                lead_id: null,
                state: 'archived',
            }],
            error: null,
        })
        const conversationReactivate = query({ data: null, error: null })
        const existingClientLookup = query({
            data: { id: 'client-current', portal_short_token: 'client-token' },
            error: null,
        })
        const memberLookup = query({
            data: { user_id: 'user-current' },
            error: null,
        })
        const clientUpdate = query({ data: null, error: null })
        const conversationLink = query({ data: null, error: null })
        const messageInsert = query({
            data: { id: 'message-current' },
            error: null,
        })
        useTableQueues({
            integration_connections: [connectionLookup],
            conversations: [conversationLookup, conversationReactivate, conversationLink],
            leads: [existingClientLookup, clientUpdate],
            organization_members: [memberLookup],
            messages: [messageInsert],
        })

        const { dispatchRestoOrder } = await import('./checkout-actions')
        const result = await dispatchRestoOrder({
            orgId: 'org-current',
            items: [{ id: 'item-1', title: 'Burger', quantity: 1, price: 1000 } as any],
            total: 1000,
            customerName: 'Client',
            customerPhone: '3001234567',
            deliveryAddress: 'Street 1',
        })

        expect(result).toEqual({
            success: true,
            conversationId: 'conversation-current',
            messageId: 'message-current',
            portalToken: 'client-token',
        })
        expect(conversationReactivate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(clientUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationLink.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(messageInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            conversation_id: 'conversation-current',
        }))
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
})
