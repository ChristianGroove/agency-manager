import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    lookup: vi.fn(),
    fetch: vi.fn(),
}))

vi.mock('dns/promises', () => ({
    default: { lookup: mocks.lookup },
    lookup: mocks.lookup,
}))

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    vi.unstubAllGlobals()
    mocks.lookup.mockReset()
    mocks.fetch.mockReset()
})

describe('/api/hosting/check-status', () => {
    it('blocks localhost URLs before server-side fetch', async () => {
        vi.stubGlobal('fetch', mocks.fetch)

        const { GET } = await import('./route')
        const response = await GET(new Request('https://pixy.test/api/hosting/check-status?url=http://localhost'))

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Private hosts are not allowed' })
        expect(mocks.fetch).not.toHaveBeenCalled()
    })

    it('blocks hostnames that resolve to private addresses', async () => {
        vi.stubGlobal('fetch', mocks.fetch)
        mocks.lookup.mockResolvedValue([{ address: '10.0.0.8', family: 4 }])

        const { GET } = await import('./route')
        const response = await GET(new Request('https://pixy.test/api/hosting/check-status?url=https://tenant.example.com'))

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Private hosts are not allowed' })
        expect(mocks.lookup).toHaveBeenCalledWith('tenant.example.com', { all: true, verbatim: true })
        expect(mocks.fetch).not.toHaveBeenCalled()
    })

    it('blocks unsupported ports before server-side fetch', async () => {
        vi.stubGlobal('fetch', mocks.fetch)

        const { GET } = await import('./route')
        const response = await GET(new Request('https://pixy.test/api/hosting/check-status?url=https://example.com:8080'))

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Unsupported URL port' })
        expect(mocks.lookup).not.toHaveBeenCalled()
        expect(mocks.fetch).not.toHaveBeenCalled()
    })

    it('checks public hostnames with a bounded HEAD request', async () => {
        mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
        mocks.fetch.mockResolvedValue(new Response(null, { status: 204 }))
        vi.stubGlobal('fetch', mocks.fetch)

        const { GET } = await import('./route')
        const response = await GET(new Request('https://pixy.test/api/hosting/check-status?url=example.com'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.status).toBe('online')
        expect(body.code).toBe(204)
        expect(mocks.fetch).toHaveBeenCalledWith(
            'https://example.com/',
            expect.objectContaining({
                method: 'HEAD',
                redirect: 'manual',
                cache: 'no-store',
            })
        )
    })

    it('normalizes whitespace and mixed-case protocols', async () => {
        mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
        mocks.fetch.mockResolvedValue(new Response(null, { status: 204 }))
        vi.stubGlobal('fetch', mocks.fetch)

        const { GET } = await import('./route')
        const encodedUrl = encodeURIComponent(' HTTP://example.com ')
        const response = await GET(new Request(`https://pixy.test/api/hosting/check-status?url=${encodedUrl}`))

        expect(response.status).toBe(200)
        expect(mocks.fetch).toHaveBeenCalledWith(
            'http://example.com/',
            expect.objectContaining({
                method: 'HEAD',
                redirect: 'manual',
            })
        )
    })

    it('does not expose fetch failure details in production offline responses', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
        mocks.fetch.mockRejectedValue(
            new Error('hosting provider token secret-value failed probing origin')
        )
        vi.stubGlobal('fetch', mocks.fetch)

        const { GET } = await import('./route')
        const response = await GET(new Request('https://pixy.test/api/hosting/check-status?url=example.com'))
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('offline')
        expect(responseText).toContain('Unable to reach host')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('provider token')
    })
})
