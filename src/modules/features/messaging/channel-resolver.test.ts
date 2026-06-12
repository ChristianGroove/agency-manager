import { describe, expect, it, vi } from 'vitest'
import { ChannelResolver } from './channel-resolver'

function queryResult(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
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
