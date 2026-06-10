import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    decryptObject: vi.fn(),
    fetch: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
            if (typeof value === 'string') return value
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

function setupProductionMetaCallingRoute() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubGlobal('fetch', mocks.fetch)

    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        single: vi.fn(async () => ({
            data: {
                credentials: {
                    accessToken: 'meta-access-token',
                    phoneNumberId: 'phone_123',
                },
                metadata: {},
            },
            error: null,
        })),
    }

    mocks.createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: 'user_123' } }, error: null })),
        },
        from: vi.fn(() => builder),
    })
    mocks.getCurrentOrganizationId.mockResolvedValue('org_123')
    mocks.decryptObject.mockImplementation((value: unknown) => value)
}

describe('/api/meta/calling', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it('does not expose Meta Graph failure details when reading calling settings', async () => {
        setupProductionMetaCallingRoute()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
            error: {
                message: 'meta token secret-value failed calling lookup',
                type: 'OAuthException',
                code: 190,
            },
        }), { status: 500 }))

        const { GET } = await import('./route')
        const response = await GET()
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(body).toEqual({
            enabled: false,
            iconVisibility: 'HIDE',
            source: 'error',
            error: 'Meta Calling request failed',
        })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const logText = [
            collectConsoleCalls(logSpy),
            collectConsoleCalls(errorSpy),
        ].join('\n')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('meta token')
    })

    it('does not expose Meta Graph failure details when toggling calling', async () => {
        setupProductionMetaCallingRoute()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
            error: {
                message: 'meta token secret-value failed calling toggle',
                type: 'OAuthException',
                code: 190,
            },
        }), { status: 403 }))

        const { POST } = await import('./route')
        const response = await POST(new Request('https://pixy.test/api/meta/calling', {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle', enabled: true }),
        }) as any)
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(403)
        expect(body).toEqual({
            success: false,
            error: 'Meta Calling request failed',
        })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')
        expect(responseText).not.toContain('meta_error')

        const logText = [
            collectConsoleCalls(logSpy),
            collectConsoleCalls(errorSpy),
        ].join('\n')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('meta token')
    })

    it('does not expose unexpected credential errors in production', async () => {
        setupProductionMetaCallingRoute()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.decryptObject.mockImplementation(() => {
            throw new Error('decryption secret-value failed for meta token')
        })

        const { POST } = await import('./route')
        const response = await POST(new Request('https://pixy.test/api/meta/calling', {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle', enabled: true }),
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal server error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })

    it('keeps sending the expected Meta payload when toggling calling successfully', async () => {
        setupProductionMetaCallingRoute()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

        const { POST } = await import('./route')
        const response = await POST(new Request('https://pixy.test/api/meta/calling', {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle', enabled: true }),
        }) as any)
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({
            success: true,
            status: 'ENABLED',
            meta_response: { success: true },
        })
        expect(mocks.fetch).toHaveBeenCalledWith(
            'https://graph.facebook.com/v22.0/phone_123/settings',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    Authorization: 'Bearer meta-access-token',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    calling: {
                        status: 'ENABLED',
                        call_icon_visibility: 'DEFAULT',
                    },
                }),
            })
        )
    })
})
