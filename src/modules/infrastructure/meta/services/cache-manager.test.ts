import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    adsGetMetrics: vi.fn(),
    connectorConstructor: vi.fn(),
    createClient: vi.fn(),
    socialGetMetrics: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
    createClient: mocks.createClient,
}))

vi.mock('./connector', () => ({
    MetaConnector: class {
        constructor(accessToken: string) {
            mocks.connectorConstructor(accessToken)
        }
    },
}))

vi.mock('./ads-service', () => ({
    AdsService: class {
        getMetrics = mocks.adsGetMetrics
    },
}))

vi.mock('./social-service', () => ({
    SocialService: class {
        getMetrics = mocks.socialGetMetrics
    },
}))

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
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

function queryBuilder(result: unknown) {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) => (
            Promise.resolve(result).then(resolve, reject)
        ),
    }
    return builder
}

function setupSupabase(configResult: unknown, options: {
    adsUpsertResult?: unknown
    socialUpsertResult?: unknown
} = {}) {
    const adsUpsert = vi.fn(async () => options.adsUpsertResult || { error: null })
    const socialUpsert = vi.fn(async () => options.socialUpsertResult || { error: null })
    const from = vi.fn((table: string) => {
        if (table === 'integration_configs') return queryBuilder(configResult)
        if (table === 'meta_ads_metrics') return { upsert: adsUpsert }
        if (table === 'meta_social_metrics') return { upsert: socialUpsert }
        throw new Error(`Unexpected table ${table}`)
    })

    mocks.createClient.mockReturnValue({ from })
    return { adsUpsert, from, socialUpsert }
}

function setupProductionEnv() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
}

describe('MetaCacheManager', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.adsGetMetrics.mockReset()
        mocks.connectorConstructor.mockReset()
        mocks.createClient.mockReset()
        mocks.socialGetMetrics.mockReset()
    })

    it('does not expose database sync errors in production results or logs', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        setupSupabase({
            data: null,
            error: {
                message: 'service role secret-value failed reading Meta configs',
                code: 'PGRST123',
            },
        })

        const { MetaCacheManager } = await import('./cache-manager')
        const result = await new MetaCacheManager().syncAll('client_123')
        const responseText = JSON.stringify(result)

        expect(result).toEqual({
            success: false,
            processed: 0,
            errors: [{ type: 'db', error: 'Database sync failed' }],
        })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('service role')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('service role')
    })

    it('does not expose per-client Meta sync errors in production results or logs', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        setupSupabase({
            data: [{
                access_token: 'meta-access-token-secret-value',
                ad_account_id: 'act_123',
                client_id: 'client_123',
                page_id: null,
            }],
            error: null,
        })
        mocks.adsGetMetrics.mockRejectedValue(new Error('meta token secret-value failed ads lookup'))

        const { MetaCacheManager } = await import('./cache-manager')
        const result = await new MetaCacheManager().syncAll('client_123')
        const responseText = JSON.stringify(result)

        expect(result).toEqual({
            success: true,
            processed: 1,
            errors: [{ client: 'client_123', type: 'ads', error: 'Ads sync failed' }],
        })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })

    it('keeps syncing ads metrics when Meta and database writes succeed', async () => {
        setupProductionEnv()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        setupSupabase({
            data: [{
                access_token: 'meta-access-token',
                ad_account_id: 'act_123',
                client_id: 'client_123',
                page_id: null,
            }],
            error: null,
        })
        mocks.adsGetMetrics.mockResolvedValue({
            spend: 100,
            impressions: 1000,
            clicks: 50,
            ctr: 5,
            cpc: 2,
            roas: 1.5,
            campaigns: [],
        })

        const { MetaCacheManager } = await import('./cache-manager')
        const result = await new MetaCacheManager().syncAll('client_123')

        expect(result).toEqual({ success: true, processed: 1, errors: [] })
        expect(mocks.connectorConstructor).toHaveBeenCalledWith('meta-access-token')
        expect(mocks.adsGetMetrics).toHaveBeenCalledWith('act_123')
    })
})
