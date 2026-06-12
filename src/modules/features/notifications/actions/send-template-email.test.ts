import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    getEffectiveBranding: vi.fn(),
    renderTemplate: vi.fn(),
    sendEmail: vi.fn(),
    getPortalUrl: vi.fn((path: string) => `https://app.pixy.test${path}`),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/branding/actions', () => ({
    getEffectiveBranding: mocks.getEffectiveBranding,
}))

vi.mock('@/modules/features/notifications/template-engine', () => ({
    TemplateEngine: {
        render: mocks.renderTemplate,
    },
}))

vi.mock('@/modules/features/notifications/email.service', () => ({
    EmailService: {
        send: mocks.sendEmail,
    },
}))

vi.mock('@/modules/infrastructure/utils/utils', () => ({
    getPortalUrl: mocks.getPortalUrl,
}))

function selectEqSingleQuery(result: unknown) {
    const query: any = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.single = vi.fn(async () => result)
    return query
}

function selectEqOrQuery(result: unknown) {
    const query: any = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.or = vi.fn(async () => result)
    return query
}

function createSupabaseMock(queues: Record<string, unknown[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    return {
        from: vi.fn((table: string) => {
            const queue = tableQueues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function clientRecord(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Client One',
        email: 'client@pixy.test',
        phone: '+573001112233',
        portal_short_token: 'short-token',
        portal_token: 'long-token',
        ...overrides,
    }
}

function setupSuccessfulRenderAndSend() {
    mocks.getEffectiveBranding.mockResolvedValue({
        name: 'Pixy Agency',
        colors: { primary: '#111111', secondary: '#222222' },
        logos: { main: null, main_light: null },
        website: 'https://pixy.test',
    })
    mocks.renderTemplate.mockResolvedValue({ html: '<p>Email</p>', subject: 'Rendered subject' })
    mocks.sendEmail.mockResolvedValue({ success: true, data: { id: 'email_1' } })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.resetModules()
})

describe('sendTemplateEmail', () => {
    it('requires the recipient to belong to the current organization before sending', async () => {
        const clientLookup = selectEqSingleQuery({ data: null, error: null })
        const leadLookup = selectEqSingleQuery({ data: null, error: null })
        const supabase = createSupabaseMock({
            leads: [clientLookup, leadLookup],
        })
        mocks.createClient.mockResolvedValue(supabase)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { sendTemplateEmail } = await import('./send-template-email')
        const result = await sendTemplateEmail({
            clientId: 'client-other-org',
            templateKey: 'portal_invite',
        })

        expect(result).toEqual({ success: false, error: 'Client not found or missing email' })
        expect(clientLookup.eq).toHaveBeenCalledWith('id', 'client-other-org')
        expect(clientLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(leadLookup.eq).toHaveBeenCalledWith('id', 'client-other-org')
        expect(leadLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.renderTemplate).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('scopes invoice template context to the current organization and recipient client', async () => {
        const clientLookup = selectEqSingleQuery({ data: clientRecord(), error: null })
        const invoiceLookup = selectEqSingleQuery({
            data: {
                id: 'invoice-current',
                number: 'INV-001',
                total: 1200,
                date: '2026-06-10',
                due_date: '2026-06-20',
                client_id: 'client-current',
            },
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [clientLookup],
            invoices: [invoiceLookup],
        })
        mocks.createClient.mockResolvedValue(supabase)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        setupSuccessfulRenderAndSend()

        const { sendTemplateEmail } = await import('./send-template-email')
        const result = await sendTemplateEmail({
            clientId: 'client-current',
            templateKey: 'invoice_new',
            contextId: 'invoice-current',
        })

        expect(result).toEqual({ success: true, data: { id: 'email_1' } })
        expect(invoiceLookup.eq).toHaveBeenCalledWith('id', 'invoice-current')
        expect(invoiceLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(invoiceLookup.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(mocks.renderTemplate).toHaveBeenCalledWith(
            'org-current',
            'invoice_new',
            expect.objectContaining({
                client_name: 'Client One',
                invoice_number: 'INV-001',
                document_type: 'invoice',
            })
        )
        expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'client@pixy.test',
            organizationId: 'org-current',
        }))
    })

    it('does not send invoice templates when the invoice is outside the recipient scope', async () => {
        const clientLookup = selectEqSingleQuery({ data: clientRecord(), error: null })
        const invoiceLookup = selectEqSingleQuery({ data: null, error: null })
        const supabase = createSupabaseMock({
            leads: [clientLookup],
            invoices: [invoiceLookup],
        })
        mocks.createClient.mockResolvedValue(supabase)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { sendTemplateEmail } = await import('./send-template-email')
        const result = await sendTemplateEmail({
            clientId: 'client-current',
            templateKey: 'invoice_new',
            contextId: 'invoice-other-client',
        })

        expect(result).toEqual({ success: false, error: 'Context not found' })
        expect(invoiceLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(invoiceLookup.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.renderTemplate).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('does not send quote templates when the quote belongs to a different client in the same organization', async () => {
        const clientLookup = selectEqSingleQuery({ data: clientRecord(), error: null })
        const quoteLookup = selectEqSingleQuery({
            data: {
                id: 'quote-current',
                number: 'Q-001',
                total: 500,
                title: 'Secret quote',
                client_id: 'client-other',
                lead_id: null,
            },
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [clientLookup],
            quotes: [quoteLookup],
        })
        mocks.createClient.mockResolvedValue(supabase)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { sendTemplateEmail } = await import('./send-template-email')
        const result = await sendTemplateEmail({
            clientId: 'client-current',
            templateKey: 'quote_new',
            contextId: 'quote-current',
        })

        expect(result).toEqual({ success: false, error: 'Context not found' })
        expect(quoteLookup.eq).toHaveBeenCalledWith('id', 'quote-current')
        expect(quoteLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.renderTemplate).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('scopes invoice summaries to the current organization and recipient client', async () => {
        const clientLookup = selectEqSingleQuery({ data: clientRecord(), error: null })
        const pendingInvoices = selectEqOrQuery({
            data: [
                { id: 'invoice-1', total: 100 },
                { id: 'invoice-2', total: 200 },
            ],
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [clientLookup],
            invoices: [pendingInvoices],
        })
        mocks.createClient.mockResolvedValue(supabase)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        setupSuccessfulRenderAndSend()

        const { sendTemplateEmail } = await import('./send-template-email')
        const result = await sendTemplateEmail({
            clientId: 'client-current',
            templateKey: 'invoice_summary',
            contextId: 'client-current',
        })

        expect(result).toEqual({ success: true, data: { id: 'email_1' } })
        expect(pendingInvoices.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(pendingInvoices.eq).toHaveBeenCalledWith('client_id', 'client-current')
        expect(pendingInvoices.or).toHaveBeenCalledWith('status.eq.pending,status.eq.overdue')
        expect(mocks.renderTemplate).toHaveBeenCalledWith(
            'org-current',
            'invoice_summary',
            expect.objectContaining({
                total_amount: '$300',
                count: 2,
                document_type: 'summary',
            })
        )
    })
})
