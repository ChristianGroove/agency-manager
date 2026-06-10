import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    requireOrgRole: vi.fn(),
    revalidatePath: vi.fn(),
    exchangeForLongLivedPageToken: vi.fn(),
    subscribePageWebhooks: vi.fn(),
    subscribeWABA: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
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

vi.mock('@/modules/infrastructure/meta/services/graph-api', () => ({
    MetaGraphAPI: class {
        exchangeForLongLivedPageToken = mocks.exchangeForLongLivedPageToken
        subscribePageWebhooks = mocks.subscribePageWebhooks
    },
}))

vi.mock('@/modules/infrastructure/meta/services/waba-subscription-manager', () => ({
    wabaSubscriptionManager: {
        subscribeWABA: mocks.subscribeWABA,
    },
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

function createQueryBuilder(options: {
    limitResult?: { data?: any[]; error?: any }
    singleResult?: { data?: any; error?: any }
    updateResult?: { error?: any }
} = {}) {
    let mutationResult: Promise<{ error?: any }> | null = null
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        limit: vi.fn(async () => options.limitResult ?? { data: [], error: null }),
        insert: vi.fn(() => builder),
        update: vi.fn(() => {
            mutationResult = Promise.resolve(options.updateResult ?? { error: null })
            return builder
        }),
        single: vi.fn(async () => options.singleResult ?? { data: { id: 'channel_123' }, error: null }),
    }
    builder.then = (resolve: any, reject: any) => (
        mutationResult || Promise.resolve({ error: null })
    ).then(resolve, reject)

    return builder
}

function mockActivationDb({
    existing = [],
    insertError = null,
}: {
    existing?: any[]
    insertError?: any
} = {}) {
    const existingQuery = createQueryBuilder({ limitResult: { data: existing, error: null } })
    const insertQuery = createQueryBuilder({
        singleResult: insertError
            ? { data: null, error: insertError }
            : { data: { id: 'channel_123' }, error: null },
    })

    mocks.supabaseFrom
        .mockReturnValueOnce(existingQuery)
        .mockReturnValueOnce(insertQuery)

    return { existingQuery, insertQuery }
}

function uiActivationInput(overrides: Partial<Parameters<typeof import('./meta-channel-actions').activateMetaChannel>[0]> = {}) {
    return {
        parentConnectionId: 'parent_123',
        assetId: 'asset_123',
        assetType: 'whatsapp' as const,
        assetName: 'WhatsApp Main',
        accessToken: 'meta-access-token',
        wabaId: 'waba_123',
        ...overrides,
    }
}

describe('activateMetaChannel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.unstubAllEnvs()
        mocks.supabaseFrom.mockReset()
        mocks.getCurrentOrganizationId.mockReset()
        mocks.requireOrgRole.mockReset()
        mocks.exchangeForLongLivedPageToken.mockReset()
        mocks.subscribePageWebhooks.mockReset()
        mocks.subscribeWABA.mockReset()
        mocks.getCurrentOrganizationId.mockResolvedValue('org_123')
        mocks.requireOrgRole.mockResolvedValue(undefined)
        mocks.exchangeForLongLivedPageToken.mockResolvedValue('long-lived-page-token')
        mocks.subscribePageWebhooks.mockResolvedValue({ success: true })
        mocks.subscribeWABA.mockResolvedValue({ success: true })
    })

    it('does not expose DB failure details in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockActivationDb({
            insertError: { message: 'database secret-value leaked integration token' },
        })

        const { activateMetaChannel } = await import('./meta-channel-actions')
        const result = await activateMetaChannel(uiActivationInput())

        expect(result).toEqual({
            success: false,
            error: 'Meta channel activation failed',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('integration token')
    })

    it('does not expose Meta setup warning details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockActivationDb()
        mocks.exchangeForLongLivedPageToken.mockRejectedValue(
            new Error('page token secret-value rejected by Meta')
        )

        const { activateMetaChannel } = await import('./meta-channel-actions')
        const result = await activateMetaChannel(uiActivationInput({
            assetType: 'page',
            assetName: 'Facebook Page',
            wabaId: undefined,
        }))

        expect(result).toEqual({ success: true, channelId: 'channel_123' })

        const warnLogText = collectConsoleCalls(warnSpy)
        expect(warnLogText).not.toContain('secret-value')
        expect(warnLogText).not.toContain('page token')
    })

    it('keeps returning the product-level already-active message', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mockActivationDb({
            existing: [{ id: 'channel_123', status: 'active' }],
        })

        const { activateMetaChannel } = await import('./meta-channel-actions')
        const result = await activateMetaChannel(uiActivationInput())

        expect(result.success).toBe(false)
        expect(result.error).toContain('activado')
    })
})

describe('deactivateMetaChannel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.unstubAllEnvs()
        mocks.supabaseFrom.mockReset()
        mocks.getCurrentOrganizationId.mockReset()
        mocks.requireOrgRole.mockReset()
        mocks.getCurrentOrganizationId.mockResolvedValue('org_123')
        mocks.requireOrgRole.mockResolvedValue(undefined)
    })

    it('does not expose DB failure details in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseFrom.mockReturnValueOnce(createQueryBuilder({
            updateResult: {
                error: { message: 'database secret-value leaked channel token' },
            },
        }))

        const { deactivateMetaChannel } = await import('./meta-channel-actions')
        const result = await deactivateMetaChannel('channel_123')

        expect(result).toEqual({
            success: false,
            error: 'Meta channel deactivation failed',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('channel token')
    })
})
