import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    }))
}))

function query(result: { data?: unknown; error?: unknown }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.or = vi.fn(() => chain)
    chain.is = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.maybeSingle = vi.fn(async () => result)
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
})

describe('portal service tenant scoping', () => {
    it('scopes portal invoices to the token client organization', async () => {
        const clientLookup = query({
            data: { id: 'client-current', organization_id: 'org-current' },
            error: null,
        })
        const invoiceLookup = query({
            data: { id: 'invoice-current', client_id: 'client-current', organization_id: 'org-current', emitter: {} },
            error: null,
        })
        useTableQueues({
            leads: [clientLookup],
            invoices: [invoiceLookup],
        })

        const { getPortalInvoice } = await import('./portal-service')
        const result = await getPortalInvoice('short-token', 'invoice-current')

        expect(result).toEqual(expect.objectContaining({ id: 'invoice-current' }))
        expect(invoiceLookup.eq).toHaveBeenCalledWith('id', 'invoice-current')
        expect(invoiceLookup.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(invoiceLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(invoiceLookup.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('scopes portal quotes to the token client organization', async () => {
        const clientLookup = query({
            data: { id: 'client-current', organization_id: 'org-current' },
            error: null,
        })
        const quoteLookup = query({
            data: { id: 'quote-current', client_id: 'client-current', organization_id: 'org-current', emitter: {} },
            error: null,
        })
        useTableQueues({
            leads: [clientLookup],
            quotes: [quoteLookup],
        })

        const { getPortalQuote } = await import('./portal-service')
        const result = await getPortalQuote('short-token', 'quote-current')

        expect(result).toEqual(expect.objectContaining({ id: 'quote-current' }))
        expect(quoteLookup.eq).toHaveBeenCalledWith('id', 'quote-current')
        expect(quoteLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(quoteLookup.or).toHaveBeenCalledWith('client_id.eq.client-current,lead_id.eq.client-current')
    })

    it('scopes portal briefings to the token client organization', async () => {
        const clientLookup = query({
            data: { id: 'client-current', organization_id: 'org-current' },
            error: null,
        })
        const briefingLookup = query({
            data: { id: 'briefing-current', client_id: 'client-current', organization_id: 'org-current' },
            error: null,
        })
        useTableQueues({
            leads: [clientLookup],
            briefings: [briefingLookup],
        })

        const { getPortalBriefing } = await import('./portal-service')
        const result = await getPortalBriefing('short-token', 'briefing-current')

        expect(result).toEqual(expect.objectContaining({ id: 'briefing-current' }))
        expect(briefingLookup.eq).toHaveBeenCalledWith('id', 'briefing-current')
        expect(briefingLookup.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(briefingLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not read briefing responses until briefing ownership is verified', async () => {
        const clientLookup = query({
            data: { id: 'client-current', organization_id: 'org-current' },
            error: null,
        })
        const briefingLookup = query({
            data: null,
            error: { code: 'PGRST116', message: 'No rows' },
        })
        useTableQueues({
            leads: [clientLookup],
            briefings: [briefingLookup],
        })

        const { getPortalBriefingResponses } = await import('./portal-service')

        await expect(getPortalBriefingResponses('short-token', 'briefing-other-org')).rejects.toThrow('Unauthorized')
        expect(briefingLookup.eq).toHaveBeenCalledWith('id', 'briefing-other-org')
        expect(briefingLookup.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(briefingLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.from).not.toHaveBeenCalledWith('briefing_responses')
    })
})
