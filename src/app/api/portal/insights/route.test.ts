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
    organization = orgData,
    settings = { portal_modules: { insights: true } },
    ads = { spend: '1200', snapshot_date: '2026-06-01T00:00:00.000Z' },
    social = {
        facebook_data: { followers: 100 },
        instagram_data: { followers: 50 },
        snapshot_date: '2026-06-01T00:00:00.000Z',
    },
}: {
    client?: any
    organization?: any
    settings?: any
    ads?: any
    social?: any
} = {}) {
    mocks.from.mockImplementation((table: string) => {
        if (table === 'leads') {
            return createBuilder({ maybeSingle: { data: client, error: null } })
        }
        if (table === 'organizations') {
            return createBuilder({ maybeSingle: { data: organization, error: null } })
        }
        if (table === 'organization_settings') {
            return createBuilder({ maybeSingle: { data: settings, error: null } })
        }
        if (table === 'meta_ads_metrics') {
            return createBuilder({ maybeSingle: { data: ads, error: null } })
        }
        if (table === 'meta_social_metrics') {
            return createBuilder({ maybeSingle: { data: social, error: null } })
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
})
