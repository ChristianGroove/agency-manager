import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    requireOrgRole: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
        auth: {
            admin: {
                generateLink: vi.fn(),
                signOut: vi.fn(),
            },
        },
    }))
}))

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    requireSuperAdmin: vi.fn(),
}))

vi.mock('@/modules/core/iam/services/org-roles', () => ({
    requireOrgRole: mocks.requireOrgRole,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('next/headers', () => ({
    headers: vi.fn(async () => new Headers()),
}))

vi.mock('@/modules/features/notifications/email.service', () => ({
    EmailService: {
        send: vi.fn(),
    },
}))

vi.mock('@/modules/infrastructure/meta/services/oauth-state', () => ({
    createMetaOAuthState: vi.fn(() => 'signed-state'),
}))

type QueryResult = { data?: any, error?: any }

function createQueryBuilder(options: {
    maybeSingle?: QueryResult
    updateResult?: { error: any }
    insertResult?: { error: any }
    deleteResult?: { error: any }
    capture?: { update?: any, insert?: any }
} = {}) {
    let mutationResult: Promise<{ error: any }> | null = null
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => mutationResult || builder),
        maybeSingle: vi.fn(async () => options.maybeSingle ?? { data: null, error: null }),
        single: vi.fn(async () => options.maybeSingle ?? { data: null, error: null }),
        update: vi.fn((payload: any) => {
            if (options.capture) options.capture.update = payload
            mutationResult = Promise.resolve(options.updateResult ?? { error: null })
            return builder
        }),
        insert: vi.fn(async (payload: any) => {
            if (options.capture) options.capture.insert = payload
            return options.insertResult ?? { error: null }
        }),
        delete: vi.fn(() => {
            mutationResult = Promise.resolve(options.deleteResult ?? { error: null })
            return builder
        }),
    }

    return builder
}

function mockClientAccess() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-1')
    mocks.requireOrgRole.mockResolvedValue(undefined)
}

describe('Meta admin actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockClientAccess()
    })

    it('redacts Meta access tokens before returning config to the client', async () => {
        mocks.from.mockImplementation((table: string) => {
            if (table === 'clients') {
                return createQueryBuilder({ maybeSingle: { data: { id: 'client-1', organization_id: 'org-1' }, error: null } })
            }
            if (table === 'leads') {
                return createQueryBuilder({ maybeSingle: { data: null, error: null } })
            }
            if (table === 'integration_configs') {
                return createQueryBuilder({
                    maybeSingle: {
                        data: {
                            id: 'config-1',
                            client_id: 'client-1',
                            platform: 'meta',
                            access_token: 'meta-secret-token',
                            ad_account_id: 'act_123',
                            page_id: 'page_123',
                        },
                        error: null,
                    },
                })
            }
            return createQueryBuilder()
        })

        const { getMetaConfig } = await import('./actions')

        const result = await getMetaConfig('client-1')

        expect(result.error).toBeNull()
        expect(result.config).toMatchObject({
            id: 'config-1',
            client_id: 'client-1',
            platform: 'meta',
            ad_account_id: 'act_123',
            page_id: 'page_123',
            has_access_token: true,
        })
        expect(result.config).not.toHaveProperty('access_token')
        expect(mocks.requireOrgRole).toHaveBeenCalledWith('admin')
    })

    it('does not read Meta config when the client is outside the current organization', async () => {
        mocks.from.mockImplementation((table: string) => {
            if (table === 'clients' || table === 'leads') {
                return createQueryBuilder({ maybeSingle: { data: null, error: null } })
            }
            if (table === 'integration_configs') {
                throw new Error('integration config should not be queried')
            }
            return createQueryBuilder()
        })

        const { getMetaConfig } = await import('./actions')

        const result = await getMetaConfig('client-outside-org')

        expect(result).toEqual({ config: null, error: 'Unauthorized' })
    })

    it('preserves the stored Meta token when saving visible asset IDs only', async () => {
        const capture: { update?: any } = {}
        mocks.from.mockImplementation((table: string) => {
            if (table === 'clients') {
                return createQueryBuilder({ maybeSingle: { data: { id: 'client-1', organization_id: 'org-1' }, error: null } })
            }
            if (table === 'leads') {
                return createQueryBuilder({ maybeSingle: { data: null, error: null } })
            }
            if (table === 'integration_configs') {
                return createQueryBuilder({
                    maybeSingle: {
                        data: {
                            id: 'config-1',
                            access_token: 'server-only-token',
                        },
                        error: null,
                    },
                    capture,
                })
            }
            return createQueryBuilder()
        })

        const formData = new FormData()
        formData.set('ad_account_id', 'act_updated')
        formData.set('page_id', 'page_updated')
        formData.set('show_ads', 'true')

        const { saveMetaConfig } = await import('./actions')

        const result = await saveMetaConfig('client-1', formData)

        expect(result).toEqual({ success: true })
        expect(capture.update).toMatchObject({
            client_id: 'client-1',
            platform: 'meta',
            access_token: 'server-only-token',
            ad_account_id: 'act_updated',
            page_id: 'page_updated',
            settings: {
                show_ads: true,
                show_social: false,
            },
        })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/clients/client-1')
    })
})
