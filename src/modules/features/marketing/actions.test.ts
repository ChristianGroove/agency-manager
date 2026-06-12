import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

type QueryResult = { data?: any, error?: any }

function createQueryBuilder(options: {
    singleResult?: QueryResult
    updateResult?: { error: any }
    insertResult?: { error: any }
    capture?: { update?: any, insert?: any }
} = {}) {
    let mutationResult: Promise<{ error: any }> | null = null
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        single: vi.fn(async () => options.singleResult ?? { data: null, error: null }),
        update: vi.fn((payload: any) => {
            if (options.capture) options.capture.update = payload
            mutationResult = Promise.resolve(options.updateResult ?? { error: null })
            return builder
        }),
        insert: vi.fn(async (payload: any) => {
            if (options.capture) options.capture.insert = payload
            return options.insertResult ?? { error: null }
        }),
    }
    builder.then = (resolve: any, reject: any) => (
        mutationResult || Promise.resolve({ data: null, error: null })
    ).then(resolve, reject)

    return builder
}

function mockSupabase(from: ReturnType<typeof vi.fn>) {
    mocks.createClient.mockResolvedValue({
        auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: 'user_123' } } })),
        },
        from,
    })
}

describe('marketing actions', () => {
    afterEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
    })

    it('redacts organization Meta credentials before returning config to clients', async () => {
        const from = vi.fn((table: string) => {
            if (table === 'organization_members') {
                return createQueryBuilder({
                    singleResult: { data: { organization_id: 'org_123' }, error: null },
                })
            }
            if (table === 'integration_connections') {
                return createQueryBuilder({
                    singleResult: {
                        data: {
                            id: 'conn_123',
                            organization_id: 'org_123',
                            provider_key: 'meta_ads_monitor',
                            credentials: {
                                access_token: 'meta-secret-token',
                                ad_account_id: 'act_123',
                                page_id: 'page_123',
                            },
                            status: 'active',
                        },
                        error: null,
                    },
                })
            }
            return createQueryBuilder()
        })
        mockSupabase(from)

        const { getOrgMetaConfig } = await import('./actions')
        const result = await getOrgMetaConfig()
        const resultText = JSON.stringify(result)

        expect(result.config).toMatchObject({
            id: 'conn_123',
            has_access_token: true,
            credentials: {
                ad_account_id: 'act_123',
                page_id: 'page_123',
            },
        })
        expect(result.config.credentials).not.toHaveProperty('access_token')
        expect(resultText).not.toContain('meta-secret-token')
    })

    it('preserves the stored Meta token when the settings form leaves it blank', async () => {
        const capture: { update?: any } = {}
        const existingLookup = createQueryBuilder({
            singleResult: {
                data: {
                    id: 'conn_123',
                    credentials: { access_token: 'server-only-token' },
                },
                error: null,
            },
        })
        const updateQuery = createQueryBuilder({ capture })
        let integrationConnectionCalls = 0
        const from = vi.fn((table: string) => {
            if (table === 'organization_members') {
                return createQueryBuilder({
                    singleResult: { data: { organization_id: 'org_123', role: 'admin' }, error: null },
                })
            }
            if (table === 'integration_connections') {
                integrationConnectionCalls += 1
                return integrationConnectionCalls === 1 ? existingLookup : updateQuery
            }
            return createQueryBuilder()
        })
        mockSupabase(from)
        const formData = new FormData()
        formData.set('access_token', '')
        formData.set('ad_account_id', 'act_updated')
        formData.set('page_id', 'page_updated')

        const { saveOrgMetaConfig } = await import('./actions')
        const result = await saveOrgMetaConfig(formData)

        expect(result).toEqual({ success: true })
        expect(capture.update).toMatchObject({
            organization_id: 'org_123',
            provider_key: 'meta_ads_monitor',
            credentials: {
                access_token: 'server-only-token',
                ad_account_id: 'act_updated',
                page_id: 'page_updated',
            },
            status: 'active',
        })
        expect(updateQuery.eq).toHaveBeenCalledWith('id', 'conn_123')
        expect(updateQuery.eq).toHaveBeenCalledWith('organization_id', 'org_123')
        expect(updateQuery.eq).toHaveBeenCalledWith('provider_key', 'meta_ads_monitor')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings')
    })

    it('requires a submitted token when no stored Meta token exists', async () => {
        const from = vi.fn((table: string) => {
            if (table === 'organization_members') {
                return createQueryBuilder({
                    singleResult: { data: { organization_id: 'org_123', role: 'admin' }, error: null },
                })
            }
            if (table === 'integration_connections') {
                return createQueryBuilder({
                    singleResult: { data: null, error: { code: 'PGRST116' } },
                })
            }
            return createQueryBuilder()
        })
        mockSupabase(from)
        const formData = new FormData()
        formData.set('access_token', '')
        formData.set('ad_account_id', 'act_new')
        formData.set('page_id', 'page_new')

        const { saveOrgMetaConfig } = await import('./actions')
        const result = await saveOrgMetaConfig(formData)

        expect(result).toEqual({ success: false, error: 'Falta el token de acceso de Meta' })
    })
})
