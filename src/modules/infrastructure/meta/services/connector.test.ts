import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
}))

function setupFetch() {
    vi.stubGlobal('fetch', mocks.fetch)
}

function expectBearerCall(callIndex: number, token: string, pathFragment: string) {
    const fetchCall = mocks.fetch.mock.calls[callIndex] as unknown[]
    const fetchUrl = new URL(String(fetchCall[0]))

    expect(String(fetchCall[0])).toContain(pathFragment)
    expect(fetchUrl.searchParams.has('access_token')).toBe(false)
    expect(fetchCall[1]).toEqual(expect.objectContaining({
        headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
        }),
    }))

    return fetchUrl
}

describe('MetaConnector', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.fetch.mockReset()
    })

    it('sends generic graph tokens through Authorization headers', async () => {
        setupFetch()
        mocks.fetch
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

        const { MetaConnector } = await import('./connector')
        const connector = new MetaConnector('connector-token-secret-value')

        await expect(connector.getAdAccountInsights('act_123')).resolves.toEqual({ data: [] })
        await expect(connector.subscribeToWebhooks('waba_123')).resolves.toEqual({ success: true })

        const insightsUrl = expectBearerCall(0, 'connector-token-secret-value', '/act_123/insights')
        expect(insightsUrl.searchParams.get('date_preset')).toBe('last_30d')

        const subscribeUrl = expectBearerCall(1, 'connector-token-secret-value', '/waba_123/subscribed_apps')
        expect(subscribeUrl.searchParams.has('subscribed_fields')).toBe(false)
        expect(mocks.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                subscribed_fields: 'messages,messaging_postbacks,message_template_status_update,talk_to_expert',
            }),
        }))
    })

    it('sends manual insight and post tokens through Authorization headers', async () => {
        setupFetch()
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        mocks.fetch
            .mockResolvedValueOnce(new Response(JSON.stringify({
                access_token: 'page-token-secret-value',
                fan_count: 15,
                instagram_business_account: { id: 'ig_123' },
            }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [{ id: 'post_123', message: 'Hello' }],
            }), { status: 200 }))

        const { MetaConnector } = await import('./connector')
        const connector = new MetaConnector('connector-token-secret-value')

        await expect(connector.getPageInsights('page_123')).resolves.toEqual({
            data: [],
            fan_count: 15,
            ig_business_id: 'ig_123',
            page_access_token: 'page-token-secret-value',
        })
        await expect(connector.getPosts('page_123', 'page-post-token-secret-value')).resolves.toEqual({
            data: [{ id: 'post_123', message: 'Hello' }],
        })

        expectBearerCall(0, 'connector-token-secret-value', '/page_123')
        for (const index of [1, 2, 3]) {
            expectBearerCall(index, 'page-token-secret-value', '/page_123/insights')
        }
        const postsUrl = expectBearerCall(4, 'page-post-token-secret-value', '/page_123/posts')
        expect(postsUrl.searchParams.get('limit')).toBe('5')
    })
})
