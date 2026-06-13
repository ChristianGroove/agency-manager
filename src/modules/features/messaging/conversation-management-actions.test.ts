import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    isSuperAdmin: vi.fn(),
    revalidatePath: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    isSuperAdmin: mocks.isSuperAdmin,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/infrastructure/utils/normalize-phone', () => ({
    normalizePhone: vi.fn((p: string) => p),
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

function adminUpdateSelectQuery(updateResult: unknown) {
    // Read path: .select().eq().single() -> returns organization data
    const readQuery: any = {}
    readQuery.eq = vi.fn(() => readQuery)
    readQuery.single = vi.fn(async () => ({
        data: { organization_id: 'org-test-id', metadata: {} },
        error: null,
    }))

    // Update path: .update().eq().eq().select() -> returns the error result
    const updateQuery: any = {}
    updateQuery.eq = vi.fn(() => updateQuery)
    updateQuery.select = vi.fn(async () => updateResult)

    return {
        select: vi.fn(() => readQuery),
        update: vi.fn(() => updateQuery),
    }
}

function searchQuery(result: unknown) {
    const query: any = {
        contains: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        select: vi.fn(() => query),
        textSearch: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return query
}

function membershipQuery(result: unknown) {
    const query: any = {}
    query.eq = vi.fn(() => query)
    query.select = vi.fn(() => query)
    query.maybeSingle = vi.fn(async () => result)
    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.isSuperAdmin.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('conversation management actions logging', () => {
    it('does not expose admin update failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: { id: 'user-test-id' } },
                    error: null,
                })),
            },
            from: vi.fn((table: string) => {
                if (table === 'organization_members') {
                    return membershipQuery({
                        data: { role: 'admin' },
                        error: null,
                    })
                }
                throw new Error(`Unexpected client table ${table}`)
            }),
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                return adminUpdateSelectQuery({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'admin update denied conversation-secret-id org-secret-id',
                    },
                })
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { updateConversationState } = await import('./conversation-management-actions')
        const result = await updateConversationState('conversation-secret-id', { state: 'active' })

        expect(result).toEqual({ success: false, error: 'Conversation management action failed' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('admin update denied')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('42501')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose search query or assignment identifiers in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-test-id')
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: { id: 'user-test-id' } },
                    error: null,
                })),
            },
            from: vi.fn((table: string) => {
                if (table === 'conversations') {
                    return searchQuery({
                        data: null,
                        error: {
                            code: '42703',
                            message: 'search failed for secret-search-text user-secret-id tag-secret-value',
                        },
                    })
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { searchConversations } = await import('./conversation-management-actions')
        const result = await searchConversations('secret-search-text', {
            assignedTo: 'user-secret-id',
            tags: ['tag-secret-value'],
        })

        expect(result).toEqual({
            success: false,
            error: 'Conversation management action failed',
            data: [],
        })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-search-text')
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('tag-secret-value')
        expect(logText).not.toContain('search failed')
        expect(logText).toContain('queryPresent')
        expect(logText).toContain('assignedToPresent')
        expect(logText).toContain('tagsCount')
        expect(logText).toContain('42703')
    })
})
