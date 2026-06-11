import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    from: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    getEffectiveBranding: vi.fn(),
    getQuoteEmailHtml: vi.fn(),
    sendEmail: vi.fn(),
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

vi.mock('@/modules/infrastructure/notifications/services/email-templates', () => ({
    getQuoteEmailHtml: mocks.getQuoteEmailHtml,
}))

vi.mock('@/modules/features/notifications/email.service', () => ({
    EmailService: {
        send: mocks.sendEmail,
    },
}))

function mockSupabaseUser(user: { id: string } | null) {
    mocks.createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn(async () => ({
                data: { user },
                error: null,
            })),
        },
        from: mocks.from,
    })
}

function quoteRequest(overrides: Record<string, unknown> = {}) {
    return new Request('https://pixy.test/api/send-quote', {
        method: 'POST',
        body: JSON.stringify({
            quoteId: 'quote_1',
            email: 'client@pixy.test',
            pdfBase64: `data:application/pdf;base64,${Buffer.from('%PDF').toString('base64')}`,
            organizationId: 'org_1',
            ...overrides,
        }),
    })
}

function quoteRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: 'quote_1',
        number: 'Q-001',
        total: 100,
        date: '2026-06-10',
        client: { name: 'Acme', email: 'client@pixy.test' },
        lead: null,
        ...overrides,
    }
}

function mockQuoteLookup(result: { data: unknown; error: unknown }) {
    const query: any = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.is = vi.fn(() => query)
    query.single = vi.fn(async () => result)
    mocks.from.mockReturnValue(query)
    return query
}

function setupProductionRuntime() {
    vi.stubEnv('VERCEL_ENV', 'production')
}

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.resetModules()
})

describe('/api/send-quote', () => {
    it('requires auth before parsing quote email payloads', async () => {
        mockSupabaseUser(null)

        const { POST } = await import('./route')
        const response = await POST(new Request('https://pixy.test/api/send-quote', {
            method: 'POST',
            body: 'not-json',
        }))

        expect(response.status).toBe(401)
        expect(mocks.getCurrentOrganizationId).not.toHaveBeenCalled()
        expect(mocks.from).not.toHaveBeenCalled()
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('rejects quote emails for a different active organization', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')

        const { POST } = await import('./route')
        const response = await POST(quoteRequest({ organizationId: 'org_2' }))

        expect(response.status).toBe(403)
        expect(mocks.from).not.toHaveBeenCalled()
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('requires a quote id before sending quote emails', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')

        const { POST } = await import('./route')
        const response = await POST(quoteRequest({ quoteId: undefined }))

        expect(response.status).toBe(400)
        expect(mocks.from).not.toHaveBeenCalled()
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('requires the quote to belong to the active organization', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')
        const query = mockQuoteLookup({ data: null, error: new Error('not found') })

        const { POST } = await import('./route')
        const response = await POST(quoteRequest())

        expect(response.status).toBe(404)
        expect(mocks.from).toHaveBeenCalledWith('quotes')
        expect(query.eq).toHaveBeenCalledWith('id', 'quote_1')
        expect(query.eq).toHaveBeenCalledWith('organization_id', 'org_1')
        expect(query.is).toHaveBeenCalledWith('deleted_at', null)
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('rejects quote emails to addresses outside the quote contact', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')
        mockQuoteLookup({ data: quoteRecord(), error: null })

        const { POST } = await import('./route')
        const response = await POST(quoteRequest({ email: 'other@pixy.test' }))

        expect(response.status).toBe(403)
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('rejects invalid quote PDF attachments before sending email', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')
        mockQuoteLookup({ data: quoteRecord(), error: null })
        mocks.getEffectiveBranding.mockResolvedValue({
            name: 'Pixy Agency',
            colors: { primary: '#111111', secondary: '#222222' },
            logos: { main: null },
            website: 'https://pixy.test',
        })

        const { POST } = await import('./route')
        const response = await POST(quoteRequest({ pdfBase64: 'not-a-pdf' }))

        expect(response.status).toBe(400)
        expect(mocks.getQuoteEmailHtml).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('sends quote emails for the authenticated active organization', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')
        mockQuoteLookup({ data: quoteRecord(), error: null })
        mocks.getEffectiveBranding.mockResolvedValue({
            name: 'Pixy Agency',
            colors: { primary: '#111111', secondary: '#222222' },
            logos: { main: null },
            website: 'https://pixy.test',
        })
        mocks.getQuoteEmailHtml.mockReturnValue('<p>Quote</p>')
        mocks.sendEmail.mockResolvedValue({ success: true, data: { id: 'email_1' } })

        const { POST } = await import('./route')
        const response = await POST(quoteRequest())
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ data: { id: 'email_1' } })
        expect(mocks.getEffectiveBranding).toHaveBeenCalledWith('org_1')
        expect(mocks.getQuoteEmailHtml).toHaveBeenCalledWith(
            'Acme',
            'Q-001',
            '$100',
            '2026-06-10',
            'https://pixy.test',
            expect.any(Object)
        )
        expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'client@pixy.test',
            organizationId: 'org_1',
            userId: 'user_1',
            attachments: [expect.objectContaining({ filename: 'Cotizacion_Q-001.pdf' })],
        }))
    })

    it('does not expose email provider failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')
        mockQuoteLookup({ data: quoteRecord(), error: null })
        mocks.getEffectiveBranding.mockResolvedValue({
            name: 'Pixy Agency',
            colors: { primary: '#111111', secondary: '#222222' },
            logos: { main: null },
            website: 'https://pixy.test',
        })
        mocks.getQuoteEmailHtml.mockReturnValue('<p>Quote</p>')
        mocks.sendEmail.mockResolvedValue({
            success: false,
            error: new Error('resend api key secret-value failed sending quote'),
        })

        const { POST } = await import('./route')
        const response = await POST(quoteRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Error sending email')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('api key')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('api key')
    })

    it('does not expose unexpected quote email exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')
        mockQuoteLookup({ data: quoteRecord(), error: null })
        mocks.getEffectiveBranding.mockRejectedValue(
            new Error('branding database password secret-value failed')
        )

        const { POST } = await import('./route')
        const response = await POST(quoteRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal Server Error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })
})
