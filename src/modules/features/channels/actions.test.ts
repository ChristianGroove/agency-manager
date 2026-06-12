import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseAdminFrom: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    requireOrgRole: vi.fn(),
    revalidatePath: vi.fn(),
    getAdapter: vi.fn(),
    checkConnectionStatus: vi.fn(),
    fetchInstance: vi.fn(),
    getQrCode: vi.fn(),
    createInstance: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseAdminFrom,
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

vi.mock('@/modules/infrastructure/integrations/registry', () => ({
    integrationRegistry: {
        getAdapter: mocks.getAdapter,
    },
}))

vi.mock('@/modules/infrastructure/integrations/adapters/evolution-adapter', () => ({
    EvolutionAdapter: class {
        fetchInstance = mocks.fetchInstance
        getQrCode = mocks.getQrCode
        createInstance = mocks.createInstance
    },
}))

function createQueryBuilder(options: {
    orderResult?: { data?: any[]; error?: any }
    singleResult?: { data?: any; error?: any }
    updateSpy?: ReturnType<typeof vi.fn>
} = {}) {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        neq: vi.fn(() => builder),
        order: vi.fn(async () => options.orderResult ?? { data: [], error: null }),
        update: (options.updateSpy ?? vi.fn(() => builder)),
        insert: vi.fn(() => builder),
        single: vi.fn(async () => options.singleResult ?? { data: null, error: null }),
    }
    builder.then = (resolve: any, reject: any) => Promise.resolve({ error: null }).then(resolve, reject)

    return builder
}

function channel(overrides: Record<string, any> = {}) {
    return {
        id: 'channel_123',
        organization_id: 'org_123',
        provider_key: 'whatsapp_cloud',
        connection_name: 'WhatsApp Main',
        status: 'active',
        credentials: {
            accessToken: 'meta-token-secret-value',
            apiKey: 'api-secret-value',
        },
        config: {},
        metadata: {},
        is_primary: false,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    }
}

describe('channel actions', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.createClient.mockReset()
        mocks.supabaseAdminFrom.mockReset()
        mocks.getCurrentOrganizationId.mockReset()
        mocks.requireOrgRole.mockReset()
        mocks.revalidatePath.mockReset()
        mocks.getAdapter.mockReset()
        mocks.checkConnectionStatus.mockReset()
        mocks.fetchInstance.mockReset()
        mocks.getQrCode.mockReset()
        mocks.createInstance.mockReset()
    })

    it('does not return channel credential secrets to client callers', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org_123')
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => createQueryBuilder({
                orderResult: { data: [channel()], error: null },
            })),
        })

        const { getChannels } = await import('./actions')
        const result = await getChannels()
        const resultText = JSON.stringify(result)

        expect(result).toEqual([expect.objectContaining({
            credentials: {
                accessToken_present: true,
                apiKey_present: true,
            },
        })])
        expect(resultText).not.toContain('meta-token-secret-value')
        expect(resultText).not.toContain('api-secret-value')
    })

    it('uses raw server-side credentials for health checks', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org_123')
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => createQueryBuilder({
                singleResult: { data: channel(), error: null },
            })),
        })
        mocks.getAdapter.mockReturnValue({
            checkConnectionStatus: mocks.checkConnectionStatus,
        })
        mocks.checkConnectionStatus.mockResolvedValue({ status: 'active', message: 'ok' })

        const { checkChannelStatus } = await import('./actions')
        const result = await checkChannelStatus('channel_123')

        expect(result).toEqual({ status: 'active', message: 'ok' })
        expect(mocks.checkConnectionStatus).toHaveBeenCalledWith({
            accessToken: 'meta-token-secret-value',
            apiKey: 'api-secret-value',
        })
    })

    it('ignores credential updates and returns a sanitized channel', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org_123')
        mocks.requireOrgRole.mockResolvedValue(undefined)
        const updateSpy = vi.fn(() => updateQuery)
        const updateQuery = createQueryBuilder({
            singleResult: {
                data: channel({ connection_name: 'Updated', credentials: { accessToken: 'new-secret-value' } }),
                error: null,
            },
            updateSpy,
        })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => updateQuery),
        })

        const { updateChannel } = await import('./actions')
        const result = await updateChannel('channel_123', {
            connection_name: 'Updated',
            credentials: { accessToken: 'client-submitted-secret' },
        } as any)
        const resultText = JSON.stringify(result)

        expect(updateSpy).toHaveBeenCalledWith({ connection_name: 'Updated' })
        expect(result.credentials).toEqual({ accessToken_present: true })
        expect(resultText).not.toContain('client-submitted-secret')
        expect(resultText).not.toContain('new-secret-value')
    })

    it('scopes deleted Evolution channel reactivation to the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('abc123-def456')
        mocks.requireOrgRole.mockResolvedValue(undefined)
        mocks.fetchInstance.mockResolvedValue({ exists: true, state: 'closed' })
        mocks.getQrCode.mockResolvedValue({ qr: 'qr-code' })

        const channelLookup = createQueryBuilder({
            orderResult: {
                data: [channel({
                    id: 'channel_deleted',
                    organization_id: 'abc123-def456',
                    provider_key: 'evolution_api',
                    status: 'deleted',
                    credentials: {
                        apiKey: 'stored-evolution-key',
                        instanceName: 'org_abc123_573001112222',
                    },
                })],
                error: null,
            },
        })
        const reactivationQuery = createQueryBuilder()
        mocks.supabaseAdminFrom
            .mockReturnValueOnce(channelLookup)
            .mockReturnValueOnce(reactivationQuery)

        const { createWhatsAppChannel } = await import('./actions')
        const result = await createWhatsAppChannel('+57 300 111 2222')

        expect(result).toEqual({
            channelId: 'channel_deleted',
            qrCode: 'qr-code',
            reconnected: true,
        })
        expect(mocks.fetchInstance).toHaveBeenCalledWith('org_abc123_573001112222')
        expect(mocks.getQrCode).toHaveBeenCalledWith(expect.objectContaining({
            apiKey: 'stored-evolution-key',
            instanceName: 'org_abc123_573001112222',
        }))
        expect(reactivationQuery.update).toHaveBeenCalledWith({ status: 'active' })
        expect(reactivationQuery.eq).toHaveBeenCalledWith('id', 'channel_deleted')
        expect(reactivationQuery.eq).toHaveBeenCalledWith('organization_id', 'abc123-def456')
    })
})
