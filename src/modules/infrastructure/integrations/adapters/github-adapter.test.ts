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

describe('GithubAdapter', () => {
    it('requires token before verification', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()

        // Missing token
        const res = await adapter.verifyCredentials({})
        expect(res.isValid).toBe(false)
        expect(res.error).toContain('token de acceso de GitHub es requerido')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('verifies valid personal user token through circuit breaker', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url === 'https://api.github.com/user') {
                return {
                    ok: true,
                    json: async () => ({
                        login: 'octocat',
                        name: 'The Octocat',
                        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
                        html_url: 'https://github.com/octocat'
                    })
                }
            }
            return { ok: false, status: 404 }
        })
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()
        const result = await adapter.verifyCredentials({
            token: 'valid-github-token'
        })

        expect(result.isValid).toBe(true)
        expect(result.metadata?.owner).toBe('octocat')
        expect(result.metadata?.login).toBe('octocat')
        expect(result.metadata?.name).toBe('The Octocat')
        expect(result.metadata?.is_org).toBe(false)
        expect(mocks.execute).toHaveBeenCalledWith('github_api', expect.any(Function))
        expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/user', {
            headers: expect.objectContaining({
                Authorization: 'Bearer valid-github-token',
                Accept: 'application/vnd.github+json'
            })
        })
    })

    it('verifies organization owner when owner is provided and is an org', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url === 'https://api.github.com/user') {
                return {
                    ok: true,
                    json: async () => ({
                        login: 'octocat',
                        name: 'The Octocat',
                        avatar_url: 'https://github.com/user.png',
                        html_url: 'https://github.com/octocat'
                    })
                }
            }
            if (url === 'https://api.github.com/orgs/my-org') {
                return {
                    ok: true,
                    json: async () => ({
                        login: 'my-org',
                        avatar_url: 'https://github.com/org.png'
                    })
                }
            }
            return { ok: false, status: 404 }
        })
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()
        const result = await adapter.verifyCredentials({
            token: 'valid-github-token',
            owner: 'my-org'
        })

        expect(result.isValid).toBe(true)
        expect(result.metadata?.owner).toBe('my-org')
        expect(result.metadata?.is_org).toBe(true)
        expect(result.metadata?.avatar_url).toBe('https://github.com/org.png')
    })

    it('verifies user owner fallback when owner is not an org but a valid user', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url === 'https://api.github.com/user') {
                return {
                    ok: true,
                    json: async () => ({
                        login: 'octocat',
                        name: 'The Octocat'
                    })
                }
            }
            if (url === 'https://api.github.com/orgs/another-user') {
                return { ok: false, status: 404 }
            }
            if (url === 'https://api.github.com/users/another-user') {
                return {
                    ok: true,
                    json: async () => ({
                        login: 'another-user',
                        avatar_url: 'https://github.com/another.png'
                    })
                }
            }
            return { ok: false, status: 404 }
        })
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()
        const result = await adapter.verifyCredentials({
            token: 'valid-github-token',
            owner: 'another-user'
        })

        expect(result.isValid).toBe(true)
        expect(result.metadata?.owner).toBe('another-user')
        expect(result.metadata?.is_org).toBe(false)
    })

    it('returns error when specified owner cannot be found as org or user', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url === 'https://api.github.com/user') {
                return {
                    ok: true,
                    json: async () => ({ login: 'octocat' })
                }
            }
            return { ok: false, status: 404 }
        })
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()
        const result = await adapter.verifyCredentials({
            token: 'valid-github-token',
            owner: 'non-existent-entity'
        })

        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
    })

    it('returns error when user endpoint responds with 401 Unauthorized', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ message: 'Bad credentials' })
        }))
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()
        const result = await adapter.verifyCredentials({
            token: 'invalid-token'
        })

        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
    })

    it('fetches repositories for owner with fallback to users if org is 404', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url.includes('/orgs/my-org/repos')) {
                return {
                    ok: true,
                    json: async () => ([
                        {
                            full_name: 'my-org/backend-service',
                            name: 'backend-service',
                            private: true,
                            html_url: 'https://github.com/my-org/backend-service',
                            default_branch: 'develop'
                        }
                    ])
                }
            }
            return { ok: false, status: 404 }
        })
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()
        const repos = await adapter.getRepositories({
            token: 'valid-token',
            owner: 'my-org'
        })

        expect(repos).toHaveLength(1)
        expect(repos[0].full_name).toBe('my-org/backend-service')
        expect(repos[0].default_branch).toBe('develop')
        expect(repos[0].is_private).toBe(true)
    })

    it('fetches repositories without owner using /user/repos', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url.includes('/user/repos')) {
                return {
                    ok: true,
                    json: async () => ([
                        {
                            full_name: 'octocat/hello-world',
                            name: 'hello-world',
                            private: false,
                            html_url: 'https://github.com/octocat/hello-world',
                            default_branch: 'main'
                        }
                    ])
                }
            }
            return { ok: false, status: 404 }
        })
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()
        const repos = await adapter.getRepositories({
            token: 'valid-token'
        })

        expect(repos).toHaveLength(1)
        expect(repos[0].full_name).toBe('octocat/hello-world')
        expect(repos[0].is_private).toBe(false)
    })

    it('onConnect unconditionally persists webhook credentials and registers org webhook in GitHub', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({ id: 987654321 })
        }))
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()

        await adapter.onConnect('conn-gh-123', {
            token: 'valid-token',
            owner: 'my-org',
            webhook_secret: 'explicit-secret-123'
        })

        // Webhook registration attempt on GitHub
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/orgs/my-org/hooks',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer valid-token',
                    'Content-Type': 'application/json'
                }),
                body: expect.stringContaining('explicit-secret-123')
            })
        )

        // Supabase update checks
        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    webhook_configured: true,
                    webhook_id: 987654321,
                    owner: 'my-org'
                })
            })
        )
    })

    it('onConnect survives 403 webhook registration failure and leaves webhook_configured: false gracefully', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: false,
            status: 403,
            text: async () => 'Resource not accessible by personal access token'
        }))
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()

        // Should not throw
        await expect(adapter.onConnect('conn-gh-123', {
            token: 'token-without-org-hook',
            owner: 'my-org',
            webhook_secret: 'explicit-secret-123'
        })).resolves.not.toThrow()

        // Verify that initial unconditional persist saved the secret with webhook_configured: false
        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    webhook_configured: false,
                    owner: 'my-org'
                }),
                credentials: expect.anything()
            })
        )
    })

    it('onDisconnect cleans up webhook via DELETE if webhook_id and owner exist', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true }))
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()

        await adapter.onDisconnect('conn-gh-123', {
            token: 'valid-token',
            owner: 'my-org',
            metadata: { webhook_id: 987654321 }
        })

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/orgs/my-org/hooks/987654321',
            expect.objectContaining({
                method: 'DELETE',
                headers: expect.objectContaining({
                    Authorization: 'Bearer valid-token'
                })
            })
        )
    })

    it('checkConnectionStatus delegates to verifyCredentials', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({ login: 'octocat' })
        }))
        vi.stubGlobal('fetch', fetchMock as any)

        const { GithubAdapter } = await import('./github-adapter')
        const adapter = new GithubAdapter()

        const statusOk = await adapter.checkConnectionStatus({ token: 'valid-token' })
        expect(statusOk.status).toBe('active')

        const statusFail = await adapter.checkConnectionStatus({ token: '' })
        expect(statusFail.status).toBe('error')
    })
})
