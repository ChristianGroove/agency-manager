import { afterEach, describe, expect, it, vi } from 'vitest'

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
            if (typeof value === 'string') return value
            if (value instanceof Error) return `${value.name}: ${value.message}`
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

describe('/api/integrations/meta/sync', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/infrastructure/meta/services/cache-manager')
    })

    it('does not expose Meta sync exception details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('INTERNAL_API_SECRET', 'internal-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        vi.doMock('@/modules/infrastructure/meta/services/cache-manager', () => ({
            MetaCacheManager: class {
                syncAll = vi.fn(async () => {
                    throw new Error('meta token secret-value failed while syncing client')
                })
            },
        }))

        const { POST } = await import('./route')
        const response = await POST(new Request('https://pixy.test/api/integrations/meta/sync', {
            method: 'POST',
            headers: { 'x-internal-api-secret': 'internal-secret' },
            body: JSON.stringify({ clientId: 'client_123' }),
        }))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal Server Error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta token')
    })
})
