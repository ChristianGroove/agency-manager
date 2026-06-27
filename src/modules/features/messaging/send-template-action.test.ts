import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    assertUsageAllowed: vi.fn(),
    createClient: vi.fn(),
    decryptObject: vi.fn((value: unknown) => value),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    saveOutboundMessage: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/actions/crud', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

vi.mock('@/modules/infrastructure/usage/usage-limiter', () => ({
    assertUsageAllowed: mocks.assertUsageAllowed,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('./services/persistence', () => ({
    MessagingPersistence: {
        saveOutboundMessage: mocks.saveOutboundMessage,
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

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        limit: vi.fn(() => query),
        order: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function createSupabaseMock(options: { conversationResult?: unknown } = {}) {
    const conversationResult = options.conversationResult || {
        data: {
            id: 'conversation-secret-id',
            organization_id: 'org-secret-id',
            connection_id: 'connection-secret-id',
            leads: {
                phone: '+571234567890',
                name: 'Client Secret',
            },
        },
        error: null,
    }

    return {
        auth: {
            getUser: vi.fn(async () => ({
                data: { user: { email: 'agent@example.com' } },
                error: null,
            })),
        },
        from: vi.fn((table: string) => {
            if (table === 'conversations') {
                return singleQuery(conversationResult)
            }

            if (table === 'integration_connections') {
                return singleQuery({
                    data: {
                        id: 'connection-secret-id',
                        credentials: {
                            accessToken: 'meta-token-secret',
                            phoneNumberId: 'phone-number-secret-id',
                        },
                        metadata: {
                            asset_id: 'phone-number-secret-id',
                        },
                    },
                    error: null,
                })
            }

            throw new Error(`Unexpected table ${table}`)
        }),
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.assertUsageAllowed.mockReset()
    mocks.createClient.mockReset()
    mocks.decryptObject.mockReset()
    mocks.decryptObject.mockImplementation((value: unknown) => value)
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.saveOutboundMessage.mockReset()
})

describe('sendTemplateMessage', () => {
    it('does not expose conversation lookup failures in production errors', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-test-id')
        mocks.createClient.mockResolvedValue(createSupabaseMock({
            conversationResult: {
                data: null,
                error: {
                    message: 'conversation-secret-id denied for org-secret-id',
                    code: '42501',
                },
            },
        }))

        const { sendTemplateMessage } = await import('./send-template-action')
        const res = await sendTemplateMessage({
            conversationId: 'conversation-secret-id',
            templateName: 'payment_reminder',
            templateLanguage: 'es',
            bodyParameters: ['client-secret-name'],
        }); expect(res.error).toMatch(/^Conversation not found$/)

        expect(fetchMock).not.toHaveBeenCalled()
        expect(mocks.assertUsageAllowed).not.toHaveBeenCalled()
        expect(mocks.saveOutboundMessage).not.toHaveBeenCalled()
    })

    it('does not expose HSM recipients, parameters, or message ids in production success logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
            messages: [{ id: 'wamid.secret.template' }],
        }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-test-id')
        mocks.createClient.mockResolvedValue(createSupabaseMock())

        const { sendTemplateMessage } = await import('./send-template-action')
        const result = await sendTemplateMessage({
            conversationId: 'conversation-secret-id',
            templateName: 'payment_reminder',
            templateLanguage: 'es',
            bodyParameters: ['client-secret-name', 'invoice-secret-amount'],
            headerParameters: ['header-secret-value'],
        })

        expect(result).toEqual({ success: true, messageId: 'wamid.secret.template' })
        const fetchOptions = fetchMock.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string>; body: string }
        expect(fetchOptions.headers.Authorization).toBe('Bearer meta-token-secret')
        expect(JSON.parse(fetchOptions.body)).toEqual(expect.objectContaining({
            to: '571234567890',
            template: expect.objectContaining({
                components: expect.arrayContaining([
                    expect.objectContaining({
                        parameters: expect.arrayContaining([
                            expect.objectContaining({ text: 'header-secret-value' }),
                        ]),
                    }),
                    expect.objectContaining({
                        parameters: expect.arrayContaining([
                            expect.objectContaining({ text: 'client-secret-name' }),
                            expect.objectContaining({ text: 'invoice-secret-amount' }),
                        ]),
                    }),
                ]),
            }),
        }))
        expect(mocks.saveOutboundMessage).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: 'conversation-secret-id',
            messageId: 'wamid.secret.template',
        }))

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('+571234567890')
        expect(logText).not.toContain('571234567890')
        expect(logText).not.toContain('phone-number-secret-id')
        expect(logText).not.toContain('client-secret-name')
        expect(logText).not.toContain('invoice-secret-amount')
        expect(logText).not.toContain('header-secret-value')
        expect(logText).not.toContain('wamid.secret.template')
        expect(logText).toContain('recipientPhonePresent')
        expect(logText).toContain('phoneNumberIdPresent')
        expect(logText).toContain('messageIdPresent')
    })

    it('does not expose Meta API template failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
            error: {
                message: 'recipient +571234567890 template parameter client-secret-name rejected',
                type: 'OAuthException',
                code: 190,
            },
        }), { status: 400 }))
        vi.stubGlobal('fetch', fetchMock)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-test-id')
        mocks.createClient.mockResolvedValue(createSupabaseMock())

        const { sendTemplateMessage } = await import('./send-template-action')
        const res = await sendTemplateMessage({
            conversationId: 'conversation-secret-id',
            templateName: 'payment_reminder',
            templateLanguage: 'es',
            bodyParameters: ['client-secret-name'],
        }); expect(res.error).toMatch(/^Template message send failed$/)

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('+571234567890')
        expect(logText).not.toContain('client-secret-name')
        expect(logText).not.toContain('phone-number-secret-id')
        expect(logText).toContain('recipientPhonePresent')
        expect(logText).toContain('phoneNumberIdPresent')
        expect(logText).toContain('OAuthException')
        expect(logText).toContain('190')
        expect(logText).toContain('hasMessage')
    })
})

