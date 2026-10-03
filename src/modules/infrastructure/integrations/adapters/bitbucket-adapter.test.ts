import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    execute: vi.fn(async (_key: string, callback: () => Promise<unknown>) => callback()),
    update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null }))
    }))
}))

vi.mock('@/modules/infrastructure/resilience/circuit-breaker', () => ({
    globalCircuitBreaker: {
        execute: mocks.execute,
    },
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(async () => ({ data: { metadata: {}, credentials: {} } }))
                }))
            })),
            update: mocks.update
        }))
    }
}))

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.execute.mockReset()
    mocks.execute.mockImplementation(async (_key: string, callback: () => Promise<unknown>) => callback())
})

describe('BitbucketAdapter', () => {
    it('requires workspace and credentials before verification', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const { BitbucketAdapter } = await import('./bitbucket-adapter')
        const adapter = new BitbucketAdapter()

        // Missing workspace
        const res1 = await adapter.verifyCredentials({ token: 'test-token' })
        expect(res1.isValid).toBe(false)
        expect(res1.error).toContain('slug del Workspace')

        // Missing token/password
        const res2 = await adapter.verifyCredentials({ workspace: 'my-workspace' })
        expect(res2.isValid).toBe(false)
        expect(res2.error).toContain('Access Token o Username')

        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('verifies valid Bearer token credentials through circuit breaker', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                slug: 'my-workspace',
                name: 'My Workspace',
                uuid: '{uuid-1234}',
                is_private: true
            })
        }))
        vi.stubGlobal('fetch', fetchMock)

        const { BitbucketAdapter } = await import('./bitbucket-adapter')
        const adapter = new BitbucketAdapter()
        const result = await adapter.verifyCredentials({
            workspace: 'my-workspace',
            token: 'valid-workspace-token'
        })

        expect(result.isValid).toBe(true)
        expect(result.metadata?.workspace).toBe('my-workspace')
        expect(result.metadata?.uuid).toBe('{uuid-1234}')
        expect(mocks.execute).toHaveBeenCalledWith('bitbucket_api', expect.any(Function))
        expect(fetchMock).toHaveBeenCalledWith('https://api.bitbucket.org/2.0/workspaces/my-workspace', {
            headers: {
                Authorization: 'Bearer valid-workspace-token',
                Accept: 'application/json'
            }
        })
    })

    it('supports Basic auth with username and app_password', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                slug: 'my-workspace',
                name: 'My Workspace',
                uuid: '{uuid-1234}'
            })
        }))
        vi.stubGlobal('fetch', fetchMock)

        const { BitbucketAdapter } = await import('./bitbucket-adapter')
        const adapter = new BitbucketAdapter()
        const result = await adapter.verifyCredentials({
            workspace: 'my-workspace',
            username: 'dev_user',
            app_password: 'secret_app_password'
        })

        expect(result.isValid).toBe(true)
        const expectedAuth = `Basic ${Buffer.from('dev_user:secret_app_password').toString('base64')}`
        expect(fetchMock).toHaveBeenCalledWith('https://api.bitbucket.org/2.0/workspaces/my-workspace', {
            headers: {
                Authorization: expectedAuth,
                Accept: 'application/json'
            }
        })
    })

    it('fetches repositories for project selector', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                values: [
                    {
                        full_name: 'my-workspace/backend-api',
                        name: 'backend-api',
                        slug: 'backend-api',
                        is_private: true,
                        links: { html: { href: 'https://bitbucket.org/my-workspace/backend-api' } },
                        mainbranch: { name: 'main' }
                    }
                ]
            })
        }))
        vi.stubGlobal('fetch', fetchMock)

        const { BitbucketAdapter } = await import('./bitbucket-adapter')
        const adapter = new BitbucketAdapter()
        const repos = await adapter.getRepositories({
            workspace: 'my-workspace',
            token: 'valid-token'
        })

        expect(repos).toHaveLength(1)
        expect(repos[0].full_name).toBe('my-workspace/backend-api')
        expect(repos[0].default_branch).toBe('main')
    })

    it('onConnect registers workspace webhook, stores uuid in metadata and secret in encrypted credentials', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                uuid: '{hook-uuid-5678}'
            })
        }))
        vi.stubGlobal('fetch', fetchMock)

        const { BitbucketAdapter } = await import('./bitbucket-adapter')
        const adapter = new BitbucketAdapter()

        await adapter.onConnect('conn-123', {
            workspace: 'my-workspace',
            token: 'valid-token'
        })

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.bitbucket.org/2.0/workspaces/my-workspace/hooks',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer valid-token',
                    'Content-Type': 'application/json'
                })
            })
        )

        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    webhook_uuid: '{hook-uuid-5678}',
                    webhook_configured: true
                }),
                credentials: expect.anything()
            })
        )

        const calls = mocks.update.mock.calls as any[][]
        const lastCall = calls[calls.length - 1]
        expect(lastCall?.[0]?.metadata?.webhook_secret).toBeUndefined()
    })

    it('onDisconnect deregisters workspace webhook via DELETE', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true }))
        vi.stubGlobal('fetch', fetchMock)

        const { BitbucketAdapter } = await import('./bitbucket-adapter')
        const adapter = new BitbucketAdapter()

        await adapter.onDisconnect('conn-123', {
            workspace: 'my-workspace',
            token: 'valid-token',
            metadata: { webhook_uuid: '{hook-uuid-5678}' }
        })

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.bitbucket.org/2.0/workspaces/my-workspace/hooks/%7Bhook-uuid-5678%7D',
            expect.objectContaining({
                method: 'DELETE',
                headers: { Authorization: 'Bearer valid-token' }
            })
        )
    })
})

