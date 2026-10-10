import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), resolve: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }))
vi.mock('@/modules/infrastructure/integrations/connection-secrets', () => ({ resolveConnectionCredentials: mocks.resolve }))
import { probeMarketingChannel, refreshStaleMarketingChannels } from './marketing-channel-health'
const row = { id: 'channel', provider_key: 'whatsapp_cloud', status: 'active', metadata: { asset_id: '123456' }, credentials: { _private: 'channel' } }
const eq = vi.fn()
beforeEach(() => {
    vi.resetAllMocks()
    const query: any = { select: () => query, eq: (...args: any[]) => { eq(...args); return query }, single: async () => ({ data: row }) }
    mocks.from.mockReturnValue(query)
    mocks.resolve.mockResolvedValue({ accessToken: 'private-token' })
    mocks.rpc.mockResolvedValue({ error: null })
})
afterEach(() => vi.unstubAllGlobals())
describe('Marketing channel quality probe', () => {
    it('scopes credentials to the authorized tenant and sends the token only in the header', async () => {
        const fetcher = vi.fn(async () => new Response(JSON.stringify({ quality_rating: 'GREEN' })))
        vi.stubGlobal('fetch', fetcher)
        expect(await probeMarketingChannel('org', 'channel')).toBe('GREEN')
        expect(eq).toHaveBeenCalledWith('organization_id', 'org')
        expect(eq).toHaveBeenCalledWith('id', 'channel')
        expect(fetcher).toHaveBeenCalledWith('https://graph.facebook.com/v24.0/123456?fields=quality_rating', expect.objectContaining({ headers: { Authorization: 'Bearer private-token' }, cache: 'no-store' }))
        expect(mocks.rpc).toHaveBeenCalledWith('store_marketing_channel_probe', { p_org: 'org', p_connection: 'channel', p_quality: 'GREEN' })
    })
    it.each([new Response('{}', { status: 401 }), new Response('{}'), new Response('{"quality_rating":"HIGH"}')])('does not manufacture a positive result from errors or unknown formats', async response => {
        vi.stubGlobal('fetch', vi.fn(async () => response))
        expect(await probeMarketingChannel('org', 'channel')).toBe('UNKNOWN')
        expect(mocks.rpc).toHaveBeenLastCalledWith('store_marketing_channel_probe', expect.objectContaining({ p_quality: 'UNKNOWN' }))
    })
    it('invalidates previous readiness on transport failure without exposing provider details', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('private-token transport failure') }))
        expect(await probeMarketingChannel('org', 'channel')).toBe('UNKNOWN')
    })
    it('does not resolve or transmit a credential reference belonging to another connection', async () => {
        const query: any = { select: () => query, eq: () => query, single: async () => ({ data: { ...row, credentials: { _private: 'foreign' } } }) }
        mocks.from.mockReturnValue(query)
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
        expect(await probeMarketingChannel('org', 'channel')).toBe('UNKNOWN')
        expect(mocks.resolve).not.toHaveBeenCalled()
        expect(fetcher).not.toHaveBeenCalled()
    })
    it('does not ignore a failure to persist the result', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{"quality_rating":"GREEN"}')))
        mocks.rpc.mockResolvedValue({ error: { message: 'database secret' } })
        await expect(probeMarketingChannel('org', 'channel')).rejects.toThrow('guardar')
    })
    it('acquires at most three probes instead of fetching every connected number', async () => {
        mocks.rpc.mockResolvedValue({ data: [], error: null })
        await refreshStaleMarketingChannels()
        expect(mocks.rpc).toHaveBeenCalledWith('claim_marketing_health_probes', { p_limit: 3 })
        expect(mocks.from).not.toHaveBeenCalled()
    })
})
