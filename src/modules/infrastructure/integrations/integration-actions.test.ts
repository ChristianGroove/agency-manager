import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    encryptObject: vi.fn((value: unknown) => ({ encrypted: value })),
    getAdapter: vi.fn(),
    revalidatePath: vi.fn(),
    securityLog: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('./encryption', () => ({
    encryptObject: mocks.encryptObject,
}))

vi.mock('./registry', () => ({
    integrationRegistry: {
        getAdapter: mocks.getAdapter,
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/core/security/security-logger', () => ({
    SecurityAction: {
        INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED',
    },
    SecurityLogger: {
        log: mocks.securityLog,
    },
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
        .map(call => call.map(value => {
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

function orderQuery(result: unknown) {
    const query: any = {
        order: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        limit: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function listQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
    }
    query.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)

    return query
}

function updateQuery(result: unknown, updateSpy: ReturnType<typeof vi.fn>) {
    const query: any = {
        eq: vi.fn(() => query),
    }
    query.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)

    return {
        update: updateSpy.mockReturnValue(query),
    }
}

function deleteConnectionQuery(result: unknown) {
    const query: any = {
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.encryptObject.mockReset()
    mocks.encryptObject.mockImplementation((value: unknown) => ({ encrypted: value }))
    mocks.getAdapter.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.securityLog.mockReset()
})

describe('integration actions logging', () => {
    it('does not expose connection fetch database errors in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'user-secret-id' } } })),
            },
            from: vi.fn((table: string) => {
                if (table === 'integration_connections') {
                    return orderQuery({
                        data: null,
                        error: {
                            code: '42501',
                            message: 'policy denied user-secret-id for connection-secret-id with token meta-access-secret',
                        },
                    })
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getConnections } = await import('./integration-actions')
        const result = await getConnections()

        expect(result).toEqual({ error: 'Failed to fetch connections' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('meta-access-secret')
        expect(logText).not.toContain('policy denied')
        expect(logText).toContain('userIdPresent')
        expect(logText).toContain('42501')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose updated connection identifiers or credentials in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const updateSpy = vi.fn()
        mocks.getAdapter.mockReturnValue({
            verifyCredentials: vi.fn(async () => ({
                isValid: true,
                metadata: { account_id: 'account-secret-id' },
            })),
        })
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'user-secret-id' } } })),
            },
            from: vi.fn((table: string) => {
                if (table === 'organization_members') {
                    return singleQuery({
                        data: { organization_id: 'org-secret-id' },
                        error: null,
                    })
                }

                if (table === 'integration_connections') {
                    return {
                        ...singleQuery({
                            data: { id: 'connection-secret-id' },
                            error: null,
                        }),
                        ...updateQuery({ error: null }, updateSpy),
                    }
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { createConnection } = await import('./integration-actions')
        const result = await createConnection({
            provider_key: 'meta_whatsapp',
            connection_name: 'Secret Production Channel',
            credentials: {
                accessToken: 'meta-access-secret',
                phoneNumberId: 'phone-secret-id',
            },
            metadata: {
                waba_id: 'waba-secret-id',
            },
        })

        expect(result).toEqual({ success: true })
        expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
            connection_name: 'Secret Production Channel',
            credentials: {
                encrypted: expect.objectContaining({
                    accessToken: 'meta-access-secret',
                    phoneNumberId: 'phone-secret-id',
                }),
            },
            metadata: expect.objectContaining({
                account_id: 'account-secret-id',
                waba_id: 'waba-secret-id',
            }),
            status: 'active',
        }))
        const updateQueryResult = updateSpy.mock.results[0].value
        expect(updateQueryResult.eq).toHaveBeenCalledWith('id', 'connection-secret-id')
        expect(updateQueryResult.eq).toHaveBeenCalledWith('organization_id', 'org-secret-id')

        const logText = collectConsoleCalls(logSpy, warnSpy, errorSpy)
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('Secret Production Channel')
        expect(logText).not.toContain('meta-access-secret')
        expect(logText).not.toContain('phone-secret-id')
        expect(logText).not.toContain('waba-secret-id')
        expect(logText).not.toContain('account-secret-id')
        expect(logText).toContain('connectionIdPresent')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('meta_whatsapp')
    })
})

describe('integration connection deletion', () => {
    it('rejects unauthenticated deletes before touching connection rows', async () => {
        const from = vi.fn()
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: null } })),
            },
            from,
        })

        const { deleteConnection } = await import('./integration-actions')
        const result = await deleteConnection('connection-secret-id')

        expect(result).toEqual({ error: 'Unauthorized' })
        expect(from).not.toHaveBeenCalled()
    })

    it('scopes connection deletes to organizations where the user is an admin', async () => {
        const membershipQuery = listQuery({
            data: [{ organization_id: 'org-secret-id' }],
            error: null,
        })
        const deleteQuery = deleteConnectionQuery({
            data: {
                organization_id: 'org-secret-id',
                provider_key: 'meta_whatsapp',
            },
            error: null,
        })
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'user-secret-id' } } })),
            },
            from: vi.fn((table: string) => {
                if (table === 'organization_members') return membershipQuery
                if (table === 'integration_connections') return deleteQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { deleteConnection } = await import('./integration-actions')
        const result = await deleteConnection('connection-secret-id')

        expect(result).toEqual({ success: true })
        expect(membershipQuery.eq).toHaveBeenCalledWith('user_id', 'user-secret-id')
        expect(membershipQuery.in).toHaveBeenCalledWith('role', ['owner', 'admin'])
        expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'connection-secret-id')
        expect(deleteQuery.in).toHaveBeenCalledWith('organization_id', ['org-secret-id'])
        expect(mocks.securityLog).toHaveBeenCalledWith(expect.objectContaining({
            organizationId: 'org-secret-id',
            actorId: 'user-secret-id',
            resourceId: 'connection-secret-id',
        }))
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/platform/integrations')
    })
})
