import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
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
    })
}

function quoteRequest(overrides: Record<string, unknown> = {}) {
    return new Request('https://pixy.test/api/send-quote', {
        method: 'POST',
        body: JSON.stringify({
            email: 'client@pixy.test',
            quoteNumber: 'Q-001',
            clientName: 'Acme',
            total: '$100',
            date: '2026-06-10',
            pdfBase64: `data:application/pdf;base64,${Buffer.from('%PDF').toString('base64')}`,
            organizationId: 'org_1',
            ...overrides,
        }),
    })
}

afterEach(() => {
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
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('rejects quote emails for a different active organization', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')

        const { POST } = await import('./route')
        const response = await POST(quoteRequest({ organizationId: 'org_2' }))

        expect(response.status).toBe(403)
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('sends quote emails for the authenticated active organization', async () => {
        mockSupabaseUser({ id: 'user_1' })
        mocks.getCurrentOrganizationId.mockResolvedValue('org_1')
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
        expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'client@pixy.test',
            organizationId: 'org_1',
            userId: 'user_1',
            attachments: [expect.objectContaining({ filename: 'Cotizacion_Q-001.pdf' })],
        }))
    })
})
