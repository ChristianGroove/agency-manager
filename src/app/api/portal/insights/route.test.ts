import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    }))
}))

type QueryResult = { data?: any, error?: any }

function createBuilder(options: { maybeSingle?: QueryResult } = {}) {
    const builder: any = {
        select: vi.fn(() => builder),
        is: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        or: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => options.maybeSingle ?? { data: null, error: null }),
        single: vi.fn(async () => options.maybeSingle ?? { data: null, error: null }),
    }

    return builder
}

function createRequest(path: string) {
    return new Request(`https://pixy.test${path}`)
}

const activeClient = {
    id: 'client-1',
    organization_id: 'org-1',
    portal_token_never_expires: true,
    portal_token_expires_at: null,
    portal_insights_settings: null,
    services: [
        { name: 'Meta Ads', status: 'active', insights_access: 'ADS' },
        { name: 'Redes Sociales', status: 'active', insights_access: 'ORGANIC' },
    ],
}

const orgData = {
    active_app_id: 'app-1',
    saas_apps: { portal_template: 'b2b_dashboard' },
}

function mockPortalInsightsTables({
    client = activeClient,
    clientError = null,
    organization = orgData,
    settings = { portal_modules: { insights: true } },
    ads = { spend: '1200', snapshot_date: '2026-06-01T00:00:00.000Z' },
    adsError = null,
    social = {
        facebook_data: { followers: 100 },
        instagram_data: { followers: 50 },
        snapshot_date: '2026-06-01T00:00:00.000Z',
    },
    socialError = null,
}: {
    client?: any
    clientError?: any
    organization?: any
    settings?: any
    ads?: any
    adsError?: any
    social?: any
    socialError?: any
} = {}) {
    mocks.from.mockImplementation((table: string) => {
        if (table === 'leads') {
            return createBuilder({ maybeSingle: { data: client, error: clientError } })
        }
        if (table === 'organizations') {
            return createBuilder({ maybeSingle: { data: organization, error: null } })
        }
        if (table === 'organization_settings') {
            return createBuilder({ maybeSingle: { data: settings, error: null } })
        }
        if (table === 'meta_ads_metrics') {
            return createBuilder({ maybeSingle: { data: ads, error: adsError } })
        }
        if (table === 'meta_social_metrics') {
            return createBuilder({ maybeSingle: { data: social, error: socialError } })
        }
        if (table === 'integration_configs') {
            throw new Error('portal insights must not read live Meta credentials')
        }

        return createBuilder()
    })
}

function queriedTables() {
    return mocks.from.mock.calls.map(call => call[0])
}

describe('/api/portal/insights', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
    })

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

    it('requires a token before querying portal data', async () => {
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights'))

        expect(response.status).toBe(400)
        expect(mocks.from).not.toHaveBeenCalled()
    })

    it('rejects invalid portal tokens before reading insights metrics', async () => {
        mockPortalInsightsTables({ client: null })
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=bad-token'))

        expect(response.status).toBe(401)
        expect(queriedTables()).toEqual(['leads'])
    })

    it('does not expose client lookup failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockPortalInsightsTables({
            client: null,
            clientError: { message: 'database password secret-value failed reading portal token' },
        })
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=bad-token'))
        const responseText = await response.text()

        expect(response.status).toBe(401)
        expect(responseText).toContain('Invalid token')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('rejects expired portal tokens before reading insights metrics', async () => {
        mockPortalInsightsTables({
            client: {
                ...activeClient,
                portal_token_never_expires: false,
                portal_token_expires_at: '2020-01-01T00:00:00.000Z',
            },
        })
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=expired-token'))

        expect(response.status).toBe(401)
        expect(queriedTables()).toEqual(['leads'])
    })

    it('rejects clients whose insights were manually disabled', async () => {
        mockPortalInsightsTables({
            client: {
                ...activeClient,
                portal_insights_settings: { override: false, access_level: 'ALL' },
            },
        })
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=portal-token'))

        expect(response.status).toBe(403)
        expect(queriedTables()).not.toContain('meta_ads_metrics')
        expect(queriedTables()).not.toContain('meta_social_metrics')
    })

    it('only returns social metrics when the portal has organic-only access', async () => {
        mockPortalInsightsTables({
            client: {
                ...activeClient,
                portal_insights_settings: { override: true, access_level: 'ORGANIC' },
            },
        })
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=portal-token&date_preset=today'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.ads).toBeNull()
        expect(body.social).toEqual({
            facebook: { followers: 100 },
            instagram: { followers: 50 },
            last_updated: '2026-06-01T00:00:00.000Z',
        })
        expect(queriedTables()).toContain('meta_social_metrics')
        expect(queriedTables()).not.toContain('meta_ads_metrics')
        expect(queriedTables()).not.toContain('integration_configs')
    })

    it('returns cached ads and social metrics without reading live Meta credentials', async () => {
        mockPortalInsightsTables()
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=portal-token&date_preset=today'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.ads).toEqual({ spend: '1200', snapshot_date: '2026-06-01T00:00:00.000Z' })
        expect(body.social).toEqual({
            facebook: { followers: 100 },
            instagram: { followers: 50 },
            last_updated: '2026-06-01T00:00:00.000Z',
        })
        expect(queriedTables()).not.toContain('integration_configs')
    })

    it('does not expose Meta metric fetch details in production warnings', async () => {
        setupProductionRuntime()
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        mockPortalInsightsTables({
            ads: null,
            adsError: { message: 'meta access token secret-value failed reading ads metrics' },
            social: null,
            socialError: { message: 'meta page token secret-value failed reading social metrics' },
        })
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=portal-token'))
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body).toEqual({ ads: null, social: null })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('access token')

        const warnText = collectConsoleCalls(warnSpy)
        expect(warnText).not.toContain('secret-value')
        expect(warnText).not.toContain('access token')
        expect(warnText).not.toContain('page token')
    })

    it('does not expose unexpected portal insights exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.from.mockImplementation((table: string) => {
            if (table === 'leads') {
                return createBuilder({ maybeSingle: { data: activeClient, error: null } })
            }

            throw new Error(`portal token secret-value failed querying ${table}`)
        })
        const { GET } = await import('./route')

        const response = await GET(createRequest('/api/portal/insights?token=portal-token'))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal Server Error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('portal token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('portal token')
    })
})
