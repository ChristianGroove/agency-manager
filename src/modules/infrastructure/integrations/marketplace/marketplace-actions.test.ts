import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    requireOrgRole: vi.fn(),
    revalidatePath: vi.fn(),
    getAdapter: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/iam/services/org-roles', () => ({
    requireOrgRole: mocks.requireOrgRole,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('next/headers', () => ({
    headers: vi.fn(async () => new Headers({ origin: 'https://pixy.test' })),
}))

vi.mock('../registry', () => ({
    integrationRegistry: {
        getAdapter: mocks.getAdapter,
    },
}))

function createQueryBuilder(options: {
    singleResult?: { data?: any; error?: any }
    awaitResult?: { data?: any; error?: any }
    updateResult?: { error?: any }
} = {}) {
    let awaitedResult: Promise<{ data?: any; error?: any }> | null = null
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        neq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        single: vi.fn(async () => options.singleResult ?? { data: null, error: null }),
        insert: vi.fn(() => builder),
        update: vi.fn(() => {
            awaitedResult = Promise.resolve(options.updateResult ?? { error: null })
            return builder
        }),
    }

    builder.then = (resolve: any, reject: any) => (
        awaitedResult || Promise.resolve(options.awaitResult ?? { data: [], error: null })
    ).then(resolve, reject)

    return builder
}

function mockSupabaseWithQueries(...queries: any[]) {
    const from = vi.fn()
    queries.forEach(query => from.mockReturnValueOnce(query))
    mocks.createClient.mockResolvedValue({ from })
    return { from }
}

function provider() {
    return {
        id: 'provider_123',
        key: 'custom_provider',
        name: 'Custom Provider',
    }
}

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

describe('marketplace actions', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    beforeEach(() => {
        vi.clearAllMocks()
        vi.unstubAllEnvs()
        mocks.createClient.mockReset()
        mocks.getCurrentOrganizationId.mockReset()
        mocks.requireOrgRole.mockReset()
        mocks.getAdapter.mockReset()
        mocks.getCurrentOrganizationId.mockResolvedValue('org_123')
        mocks.requireOrgRole.mockResolvedValue(undefined)
        mocks.getAdapter.mockReturnValue(undefined)
    })

    it('does not expose insert failure details when installing integrations in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockSupabaseWithQueries(
            createQueryBuilder({ singleResult: { data: provider(), error: null } }),
            createQueryBuilder({ awaitResult: { data: [], error: null } }),
            createQueryBuilder({
                singleResult: {
                    data: null,
                    error: { message: 'database secret-value leaked credential payload' },
                },
            })
        )

        const { installIntegration } = await import('./marketplace-actions')
        const result = await installIntegration({
            providerKey: 'custom_provider',
            connectionName: 'Custom',
            credentials: {},
        })

        expect(result).toEqual({
            success: false,
            error: 'Integration install failed',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('credential payload')
    })

    it('does not expose update failure details when uninstalling integrations in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockSupabaseWithQueries(
            createQueryBuilder({
                updateResult: {
                    error: { message: 'database secret-value leaked deleted connection' },
                },
            })
        )

        const { uninstallIntegration } = await import('./marketplace-actions')
        const result = await uninstallIntegration('connection_123')

        expect(result).toEqual({
            success: false,
            error: 'Integration uninstall failed',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('deleted connection')
    })

    it('does not return installed integration credential secrets to client callers', async () => {
        mockSupabaseWithQueries(
            createQueryBuilder({
                awaitResult: {
                    data: [{
                        id: 'connection_123',
                        organization_id: 'org_123',
                        provider_key: 'meta_business',
                        credentials: {
                            access_token: 'meta-token-secret-value',
                            apiKey: 'api-secret-value',
                        },
                        integration_providers: { key: 'meta_business' },
                    }],
                    error: null,
                },
            })
        )

        const { getInstalledIntegrations } = await import('./marketplace-actions')
        const result = await getInstalledIntegrations()
        const resultText = JSON.stringify(result)

        expect(result).toEqual([expect.objectContaining({
            id: 'connection_123',
            credentials: {
                access_token_present: true,
                apiKey_present: true,
            },
            provider: { key: 'meta_business' },
        })])
        expect(resultText).not.toContain('meta-token-secret-value')
        expect(resultText).not.toContain('api-secret-value')
    })

    it('keeps installing an integration when persistence succeeds', async () => {
        mockSupabaseWithQueries(
            createQueryBuilder({ singleResult: { data: provider(), error: null } }),
            createQueryBuilder({ awaitResult: { data: [], error: null } }),
            createQueryBuilder({
                singleResult: {
                    data: { id: 'connection_123' },
                    error: null,
                },
            })
        )

        const { installIntegration } = await import('./marketplace-actions')
        const result = await installIntegration({
            providerKey: 'custom_provider',
            connectionName: 'Custom',
            credentials: { apiKey: ' trimmed-token ' },
        })

        expect(result).toEqual({
            success: true,
            connectionId: 'connection_123',
        })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/platform/integrations')
    })
})
