import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    }))
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function query(result: { data?: unknown; error?: unknown }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.insert = vi.fn(async () => ({ error: result.error ?? null, data: result.data ?? null }))
    chain.eq = vi.fn(() => chain)
    chain.or = vi.fn(() => chain)
    chain.gte = vi.fn(() => chain)
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
    mocks.getCurrentOrganizationId.mockReset()
})

describe('portal business actions tenant safety', () => {
    it('scopes portal access logs to the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const logLookup = query({
            data: [{ id: 'log-current', client_id: 'client-current', organization_id: 'org-current' }],
            error: null,
        })
        useTableQueues({
            portal_access_logs: [logLookup],
        })

        const { getPortalAccessLogs } = await import('./business-service')
        const result = await getPortalAccessLogs('client-current', 10)

        expect(result).toEqual({
            success: true,
            data: [{ id: 'log-current', client_id: 'client-current', organization_id: 'org-current' }],
        })
        expect(logLookup.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(logLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(logLookup.limit).toHaveBeenCalledWith(10)
    })

    it('scopes accepted quotes to the portal token organization', async () => {
        const clientLookup = query({
            data: { id: 'client-current', name: 'Client', user_id: null, organization_id: 'org-current' },
            error: null,
        })
        const quoteUpdate = query({
            data: { id: 'quote-current', number: 'Q-1', total: 1000 },
            error: null,
        })
        const eventInsert = query({ data: null, error: null })
        useTableQueues({
            leads: [clientLookup],
            quotes: [quoteUpdate],
            client_events: [eventInsert],
        })

        const { acceptQuote } = await import('./business-service')
        const result = await acceptQuote('short-token', 'quote-current')

        expect(result).toEqual({ success: true })
        expect(clientLookup.select).toHaveBeenCalledWith('id, name, user_id, organization_id')
        expect(quoteUpdate.eq).toHaveBeenCalledWith('id', 'quote-current')
        expect(quoteUpdate.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(quoteUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes rejected quotes to the portal token organization', async () => {
        const clientLookup = query({
            data: { id: 'client-current', name: 'Client', user_id: null, organization_id: 'org-current' },
            error: null,
        })
        const quoteUpdate = query({
            data: { id: 'quote-current', number: 'Q-1', total: 1000 },
            error: null,
        })
        const eventInsert = query({ data: null, error: null })
        useTableQueues({
            leads: [clientLookup],
            quotes: [quoteUpdate],
            client_events: [eventInsert],
        })

        const { rejectQuote } = await import('./business-service')
        const result = await rejectQuote('short-token', 'quote-current')

        expect(result).toEqual({ success: true })
        expect(quoteUpdate.eq).toHaveBeenCalledWith('id', 'quote-current')
        expect(quoteUpdate.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(quoteUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('resolves service interest from the token organization before logging it', async () => {
        const clientLookup = query({
            data: { id: 'client-current', name: 'Client', user_id: null, organization_id: 'org-current' },
            error: null,
        })
        const serviceLookup = query({
            data: { id: 'service-current', name: 'Verified service' },
            error: null,
        })
        const existingInterestLookup = query({ data: null, error: { code: 'PGRST116' } })
        const eventInsert = query({ data: null, error: null })
        useTableQueues({
            leads: [clientLookup],
            service_catalog: [serviceLookup],
            client_events: [existingInterestLookup, eventInsert],
        })

        const { registerServiceInterest } = await import('./business-service')
        const result = await registerServiceInterest('short-token', 'service-current', 'tampered name')

        expect(result).toEqual({ success: true })
        expect(serviceLookup.eq).toHaveBeenCalledWith('id', 'service-current')
        expect(serviceLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(serviceLookup.eq).toHaveBeenCalledWith('is_visible_in_portal', true)
        expect(eventInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            client_id: 'client-current',
            metadata: {
                service_id: 'service-current',
                service_name: 'Verified service',
                channel: 'whatsapp_click',
            },
        }))
    })

    it('does not log service interest for services outside the token organization', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const clientLookup = query({
            data: { id: 'client-current', name: 'Client', user_id: null, organization_id: 'org-current' },
            error: null,
        })
        const serviceLookup = query({ data: null, error: null })
        useTableQueues({
            leads: [clientLookup],
            service_catalog: [serviceLookup],
        })

        const { registerServiceInterest } = await import('./business-service')
        const result = await registerServiceInterest('short-token', 'service-other-org', 'Other service')

        expect(result).toEqual({ success: false, error: 'Error registering interest' })
        expect(serviceLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.from).not.toHaveBeenCalledWith('client_events')
        expect(consoleError).toHaveBeenCalled()
    })
})
