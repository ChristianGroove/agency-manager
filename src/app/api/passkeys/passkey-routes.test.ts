import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseAdmin: {
        from: vi.fn(),
        auth: {
            admin: {
                listUsers: vi.fn(),
                getUserById: vi.fn(),
                generateLink: vi.fn(),
            },
        },
    },
    generateRegistrationOptions: vi.fn(),
    generateAuthenticationOptions: vi.fn(),
    verifyAuthenticationResponse: vi.fn(),
    verifyRegistrationResponse: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@simplewebauthn/server', () => ({
    generateRegistrationOptions: mocks.generateRegistrationOptions,
    generateAuthenticationOptions: mocks.generateAuthenticationOptions,
    verifyAuthenticationResponse: mocks.verifyAuthenticationResponse,
    verifyRegistrationResponse: mocks.verifyRegistrationResponse,
}))

type QueryResult = {
    data?: unknown
    error?: unknown
}

function createQuery(result: QueryResult = { data: null, error: null }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        single: vi.fn(() => Promise.resolve(result)),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => query),
        delete: vi.fn(() => query),
        then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return query
}

function createSupabaseMock(tableQueries: Record<string, any>) {
    return {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn((table: string) => {
            const query = tableQueries[table]
            if (!query) throw new Error(`Unexpected table ${table}`)
            return query
        }),
    }
}

afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
})

describe('passkey API routes', () => {
    it('rate limits repeated public passkey attempts by client IP', async () => {
        const { requirePasskeyPublicRateLimit } = await import('./_utils')
        const request = new Request('https://pixy.test/api/passkeys/login-options', {
            method: 'POST',
            headers: { 'x-forwarded-for': '203.0.113.77' },
        })

        for (let i = 0; i < 30; i++) {
            expect(requirePasskeyPublicRateLimit(request)).toBeNull()
        }

        expect(requirePasskeyPublicRateLimit(request)?.status).toBe(429)
    })

    it('stores registration challenges with the admin client', async () => {
        const authClient = createSupabaseMock({
            user_passkeys: createQuery({ data: [{ credential_id: 'existing-credential' }], error: null }),
        })
        authClient.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-1', email: 'agent@pixy.test' } },
            error: null,
        })
        mocks.createClient.mockResolvedValue(authClient)

        const challengeQuery = createQuery()
        mocks.supabaseAdmin.from.mockImplementation((table: string) => {
            if (table !== 'passkey_challenges') throw new Error(`Unexpected admin table ${table}`)
            return challengeQuery
        })
        mocks.generateRegistrationOptions.mockResolvedValue({
            challenge: 'registration-challenge',
            rp: { id: 'localhost', name: 'Pixy Agency Manager' },
        })

        const { POST } = await import('./register-options/route')
        const response = await POST()
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.challenge).toBe('registration-challenge')
        expect(authClient.from).toHaveBeenCalledWith('user_passkeys')
        expect(mocks.supabaseAdmin.from).toHaveBeenCalledWith('passkey_challenges')
        expect(challengeQuery.insert).toHaveBeenCalledWith({
            challenge: 'registration-challenge',
            user_id: 'user-1',
            type: 'registration',
        })
    })

    it('generates login options using admin access for passkeys and challenges', async () => {
        mocks.supabaseAdmin.auth.admin.listUsers.mockResolvedValue({
            data: { users: [{ id: 'user-1', email: 'agent@pixy.test' }] },
            error: null,
        })
        const passkeysQuery = createQuery({
            data: [{ credential_id: 'credential-1', transports: ['internal'] }],
            error: null,
        })
        const challengeQuery = createQuery()
        mocks.supabaseAdmin.from.mockImplementation((table: string) => {
            if (table === 'user_passkeys') return passkeysQuery
            if (table === 'passkey_challenges') return challengeQuery
            throw new Error(`Unexpected admin table ${table}`)
        })
        mocks.generateAuthenticationOptions.mockResolvedValue({
            challenge: 'authentication-challenge',
            allowCredentials: [],
        })

        const { POST } = await import('./login-options/route')
        const response = await POST(new Request('https://pixy.test/api/passkeys/login-options', {
            method: 'POST',
            body: JSON.stringify({ email: ' Agent@Pixy.TEST ' }),
        }) as any)
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.challenge).toBe('authentication-challenge')
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.supabaseAdmin.from).toHaveBeenCalledWith('user_passkeys')
        expect(mocks.supabaseAdmin.from).toHaveBeenCalledWith('passkey_challenges')
        expect(challengeQuery.insert).toHaveBeenCalledWith({
            challenge: 'authentication-challenge',
            user_id: 'user-1',
            email: 'agent@pixy.test',
            type: 'authentication',
        })
    })

    it('returns a generic unavailable response when the passkey login user is unknown', async () => {
        mocks.supabaseAdmin.auth.admin.listUsers.mockResolvedValue({
            data: { users: [] },
            error: null,
        })

        const { POST } = await import('./login-options/route')
        const response = await POST(new Request('https://pixy.test/api/passkeys/login-options', {
            method: 'POST',
            body: JSON.stringify({ email: 'missing@pixy.test' }),
        }) as any)
        const body = await response.json()

        expect(response.status).toBe(404)
        expect(body).toEqual({ error: 'Passkey login unavailable' })
        expect(mocks.supabaseAdmin.from).not.toHaveBeenCalled()
    })

    it('returns the same generic response when the user has no passkeys', async () => {
        mocks.supabaseAdmin.auth.admin.listUsers.mockResolvedValue({
            data: { users: [{ id: 'user-1', email: 'agent@pixy.test' }] },
            error: null,
        })
        const passkeysQuery = createQuery({ data: [], error: null })
        mocks.supabaseAdmin.from.mockImplementation((table: string) => {
            if (table === 'user_passkeys') return passkeysQuery
            throw new Error(`Unexpected admin table ${table}`)
        })

        const { POST } = await import('./login-options/route')
        const response = await POST(new Request('https://pixy.test/api/passkeys/login-options', {
            method: 'POST',
            body: JSON.stringify({ email: 'agent@pixy.test' }),
        }) as any)
        const body = await response.json()

        expect(response.status).toBe(404)
        expect(body).toEqual({ error: 'Passkey login unavailable' })
        expect(mocks.generateAuthenticationOptions).not.toHaveBeenCalled()
    })

    it('scopes authentication verification to the challenge user', async () => {
        const challengeQuery = createQuery({
            data: {
                id: 'challenge-1',
                challenge: 'authentication-challenge',
                user_id: 'user-1',
                email: 'agent@pixy.test',
                type: 'authentication',
                expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
        })
        const passkeysQuery = createQuery({
            data: null,
            error: { message: 'No rows found' },
        })
        mocks.supabaseAdmin.from.mockImplementation((table: string) => {
            if (table === 'passkey_challenges') return challengeQuery
            if (table === 'user_passkeys') return passkeysQuery
            throw new Error(`Unexpected admin table ${table}`)
        })

        const { POST } = await import('./login-verify/route')
        const response = await POST(new Request('https://pixy.test/api/passkeys/login-verify', {
            method: 'POST',
            body: JSON.stringify({
                email: ' Agent@Pixy.TEST ',
                credential: { id: 'credential-1' },
            }),
        }) as any)
        const body = await response.json()

        expect(response.status).toBe(404)
        expect(body.error).toBe('Passkey not found')
        expect(challengeQuery.eq).toHaveBeenCalledWith('email', 'agent@pixy.test')
        expect(passkeysQuery.eq).toHaveBeenCalledWith('credential_id', 'credential-1')
        expect(passkeysQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
        expect(mocks.verifyAuthenticationResponse).not.toHaveBeenCalled()
    })
})
