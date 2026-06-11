import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
    supabaseFrom: vi.fn(),
    transferConversation: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('./transfer-service', () => ({
    transferConversation: mocks.transferConversation,
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

function adminUpdateSelectQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(async () => result),
    }

    return {
        update: vi.fn(() => query),
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.transferConversation.mockReset()
})

describe('conversation management actions logging', () => {
    it('rejects manual assignments without an authenticated user', async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: null } })),
            },
        })

        const { assignConversation } = await import('./conversation-management-actions')
        const result = await assignConversation('conversation-1', 'target-agent')

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.transferConversation).not.toHaveBeenCalled()
    })

    it('does not expose admin update failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
        mocks.createClient.mockResolvedValue({
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
