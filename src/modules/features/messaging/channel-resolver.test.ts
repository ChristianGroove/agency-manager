import { describe, expect, it, vi } from 'vitest'
import { ChannelResolver } from './channel-resolver'

function queryResult(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        limit: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
        or: vi.fn(() => {
            throw new Error('raw or filters should not be used for webhook asset ids')
        }),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return query
}

describe('ChannelResolver', () => {
    it.each([
        { channel: 'whatsapp', metadata: { phoneNumberId: 'asset-1' }, provider: 'whatsapp_cloud', legacyAsset: { id: 'asset-1', type: 'whatsapp' } },
        { channel: 'messenger', metadata: { pageId: 'asset-1' }, provider: 'facebook_page', legacyAsset: { id: 'asset-1', type: 'page' } },
        { channel: 'instagram', metadata: { instagramBusinessId: 'asset-1' }, provider: 'instagram_dme', legacyAsset: { id: 'asset-1', type: 'instagram' } },
    ])('rejects a $channel asset claimed by a legacy connection in another tenant', async ({ channel, metadata, provider, legacyAsset }) => {
        const direct = {
            id: 'modern', organization_id: 'tenant-a', provider_key: provider,
            metadata: { asset_id: 'asset-1' },
        }
        const legacy = {
            id: 'legacy', organization_id: 'tenant-b', provider_key: 'meta_business',
            metadata: { selected_assets: [legacyAsset] },
        }
        const queries = [
            queryResult({ data: channel === 'instagram' ? [direct] : direct, error: null }),
            queryResult({ data: [legacy], error: null }),
        ]
        const supabase = { from: vi.fn(() => queries.shift()) } as any
        await expect(ChannelResolver.resolveConnection({ channel, metadata } as any, supabase))
            .rejects.toThrow('Ambiguous Meta asset ownership across organizations')
        expect(supabase.from).toHaveBeenCalledTimes(2)
    })

    it('prefers a modern WhatsApp channel over its legacy parent in the same tenant', async () => {
        const direct = { id: 'modern', organization_id: 'tenant-a', provider_key: 'whatsapp_cloud', metadata: { asset_id: 'phone-1' } }
        const legacy = { id: 'legacy', organization_id: 'tenant-a', provider_key: 'meta_business',
            metadata: { selected_assets: [{ id: 'phone-1', type: 'whatsapp' }] } }
        const queries = [queryResult({ data: direct, error: null }), queryResult({ data: [legacy], error: null })]
        const supabase = { from: vi.fn(() => queries.shift()) } as any
        const match = await ChannelResolver.resolveConnection({ channel: 'whatsapp', metadata: { phoneNumberId: 'phone-1' } } as any, supabase)
        expect(match?.connectionId).toBe('modern')
    })

    it('does not reactivate a locally disconnected WhatsApp asset through a legacy parent', async () => {
        const legacy = { id: 'legacy', organization_id: 'tenant-a', provider_key: 'meta_business',
            metadata: { selected_assets: [{ id: 'phone-1', type: 'whatsapp' }] } }
        const queries = [queryResult({ data: null, error: null }),
            queryResult({ data: [legacy], error: null }), queryResult({ data: [{ id: 'disconnected' }], error: null })]
        const supabase = { from: vi.fn(() => queries.shift()) } as any
        const match = await ChannelResolver.resolveConnection({ channel: 'whatsapp',
            metadata: { phoneNumberId: 'phone-1' } } as any, supabase)
        expect(match).toBeNull()
        expect(supabase.from).toHaveBeenCalledTimes(3)
    })

    it('fails closed if the legacy ownership lookup fails after finding a modern channel', async () => {
        const direct = { id: 'modern', organization_id: 'tenant-a', provider_key: 'whatsapp_cloud', metadata: { asset_id: 'phone-1' } }
        const queries = [queryResult({ data: direct, error: null }), queryResult({ data: null, error: { code: 'database_unavailable' } })]
        const supabase = { from: vi.fn(() => queries.shift()) } as any
        await expect(ChannelResolver.resolveConnection({ channel: 'whatsapp', metadata: { phoneNumberId: 'phone-1' } } as any, supabase))
            .rejects.toThrow('Could not resolve legacy Meta channel')
    })

    it('requires active or connected status for pre-resolved connection ids', async () => {
        const connectionQuery = queryResult({
            data: {
                id: 'connection-current',
                organization_id: 'org-current',
                provider_key: 'whatsapp_cloud',
                metadata: { asset_id: 'phone-current' },
            },
            error: null,
        })
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === 'integration_connections') return connectionQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        } as any

        const result = await ChannelResolver.resolveConnection({
            channel: 'whatsapp',
            content: 'hola',
            from: '+571234567890',
            metadata: { connectionId: 'connection-current' },
        } as any, supabase)

        expect(result).toEqual(expect.objectContaining({
            connectionId: 'connection-current',
            organizationId: 'org-current',
        }))
        expect(connectionQuery.eq).toHaveBeenCalledWith('id', 'connection-current')
        expect(connectionQuery.in).toHaveBeenCalledWith('status', ['active', 'connected'])
    })

    it('resolves Instagram connections by exact metadata match without raw or filters', async () => {
        const connectionQuery = queryResult({
            data: [{
                id: 'connection-current',
                organization_id: 'org-current',
                provider_key: 'instagram_dm',
                metadata: { asset_id: 'ig-current' },
            }],
            error: null,
        })
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === 'integration_connections') return connectionQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        } as any

        const result = await ChannelResolver.resolveConnection({
            channel: 'instagram',
            content: 'hola',
            from: 'ig-user',
            metadata: { instagramBusinessId: 'ig-current' },
        } as any, supabase)

        expect(result).toEqual(expect.objectContaining({
            connectionId: 'connection-current',
            organizationId: 'org-current',
        }))
        expect(connectionQuery.in).toHaveBeenCalledWith('provider_key', ['instagram_dm', 'instagram_dme'])
        expect(connectionQuery.in).toHaveBeenCalledWith('status', ['active', 'connected'])
        expect(connectionQuery.or).not.toHaveBeenCalled()
    })

    it('does not treat injected Instagram filter syntax as a valid asset id', async () => {
        const directQuery = queryResult({
            data: [{
                id: 'connection-current',
                organization_id: 'org-current',
                provider_key: 'instagram_dm',
                metadata: { asset_id: 'ig-current' },
            }],
            error: null,
        })
        const legacyQuery = queryResult({ data: [], error: null })
        let calls = 0
        const supabase = {
            from: vi.fn((table: string) => {
                if (table !== 'integration_connections') throw new Error(`Unexpected table ${table}`)
                calls += 1
                return calls === 1 ? directQuery : legacyQuery
            }),
        } as any

        const result = await ChannelResolver.resolveConnection({
            channel: 'instagram',
            content: 'hola',
            from: 'ig-user',
            metadata: { instagramBusinessId: 'ig-current,organization_id.not.is.null' },
        } as any, supabase)

        expect(result).toBeNull()
        expect(directQuery.or).not.toHaveBeenCalled()
        expect(legacyQuery.or).not.toHaveBeenCalled()
    })
})
