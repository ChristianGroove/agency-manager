import { createHash } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
    },
}))

type QueryResult = { data?: any, error?: any }

function createBuilder(options: {
    maybeSingle?: QueryResult
    single?: QueryResult
    list?: QueryResult
    insertResult?: { error: any }
    capture?: { insert?: any }
} = {}) {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        or: vi.fn(() => builder),
        in: vi.fn(() => builder),
        is: vi.fn(() => builder),
        neq: vi.fn(async () => options.list ?? { data: [], error: null }),
        maybeSingle: vi.fn(async () => options.maybeSingle ?? { data: null, error: null }),
        single: vi.fn(async () => options.single ?? { data: null, error: null }),
        insert: vi.fn(async (payload: any) => {
            if (options.capture) options.capture.insert = payload
            return options.insertResult ?? { error: null }
        }),
    }

    return builder
}

function createRequest(body: any) {
    return new Request('https://pixy.test/api/wompi/signature', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    })
}

const validClient = {
    id: 'client-1',
    organization_id: 'org-1',
    portal_token_never_expires: true,
    portal_token_expires_at: null,
}

const validOrgSettings = {
    wompi_public_key: 'pub_test_123',
    wompi_integrity_secret: 'integrity-secret',
    wompi_currency: 'COP',
}

function mockSignatureTables({
    client = validClient,
    invoices = [],
    orgSettings = validOrgSettings,
    capture,
}: {
    client?: any
    invoices?: any[]
    orgSettings?: any
    capture?: { insert?: any }
}) {
    mocks.from.mockImplementation((table: string) => {
        if (table === 'leads') {
            return createBuilder({ maybeSingle: { data: client, error: null } })
        }
        if (table === 'invoices') {
            return createBuilder({ list: { data: invoices, error: null } })
        }
        if (table === 'organization_settings') {
            return createBuilder({ single: { data: orgSettings, error: null } })
        }
        if (table === 'payment_transactions') {
            return createBuilder({ capture })
        }

        return createBuilder()
    })
}

describe('/api/wompi/signature', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('requires a portal token before resolving portal data', async () => {
        const { POST } = await import('./route')

        const response = await POST(createRequest({ invoiceIds: ['invoice-1'] }))

        expect(response.status).toBe(401)
        expect(mocks.from).not.toHaveBeenCalled()
    })

    it('rejects already paid invoices before creating a Wompi transaction', async () => {
        const capture: { insert?: any } = {}
        mockSignatureTables({
            capture,
            invoices: [{
                id: 'invoice-1',
                total: 120000,
                status: 'paid',
                payment_status: 'PAID',
                client_id: 'client-1',
                organization_id: 'org-1',
                client: { id: 'client-1', organization_id: 'org-1' },
            }],
        })

        const { POST } = await import('./route')

        const response = await POST(createRequest({
            invoiceIds: ['invoice-1'],
            portalToken: 'portal-short-token',
        }))
        const body = await response.json()

        expect(response.status).toBe(409)
        expect(body.error).toBe('One or more invoices are already paid')
        expect(capture.insert).toBeUndefined()
    })

    it('rejects partially paid invoices because the portal cannot calculate remaining balance yet', async () => {
        const capture: { insert?: any } = {}
        mockSignatureTables({
            capture,
            invoices: [{
                id: 'invoice-1',
                total: 120000,
                status: 'pending',
                payment_status: 'PARTIALLY_PAID',
                client_id: 'client-1',
                organization_id: 'org-1',
                client: { id: 'client-1', organization_id: 'org-1' },
            }],
        })

        const { POST } = await import('./route')

        const response = await POST(createRequest({
            invoiceIds: ['invoice-1'],
            portalToken: 'portal-short-token',
        }))
        const body = await response.json()

        expect(response.status).toBe(409)
        expect(body.error).toBe('Partially paid invoices require manual balance reconciliation')
        expect(capture.insert).toBeUndefined()
    })

    it('creates a scoped transaction and signature for payable portal invoices', async () => {
        const capture: { insert?: any } = {}
        mockSignatureTables({
            capture,
            invoices: [
                {
                    id: 'invoice-1',
                    total: '1000.50',
                    status: 'pending',
                    payment_status: 'UNPAID',
                    client_id: 'client-1',
                    organization_id: 'org-1',
                    client: { id: 'client-1', organization_id: 'org-1' },
                },
                {
                    id: 'invoice-2',
                    total: 2000,
                    status: 'overdue',
                    payment_status: 'OVERDUE',
                    client_id: 'client-1',
                    organization_id: 'org-1',
                    client: { id: 'client-1', organization_id: 'org-1' },
                },
            ],
        })

        const { POST } = await import('./route')

        const response = await POST(createRequest({
            invoiceIds: [' invoice-1 ', 'invoice-2', 'invoice-2'],
            portalToken: ' portal-short-token ',
        }))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.amountInCents).toBe(300050)
        expect(body.currency).toBe('COP')
        expect(body.publicKey).toBe('pub_test_123')
        expect(body.signature).toBe(createHash('sha256')
            .update(`${body.reference}${body.amountInCents}${body.currency}integrity-secret`)
            .digest('hex'))
        expect(capture.insert).toMatchObject({
            reference: body.reference,
            amount_in_cents: 300050,
            currency: 'COP',
            invoice_ids: ['invoice-1', 'invoice-2'],
            organization_id: 'org-1',
            metadata: {
                source: 'client_portal',
                client_id: 'client-1',
                invoice_count: 2,
            },
        })
        expect(capture.insert.id).toEqual(expect.any(String))
    })
})
