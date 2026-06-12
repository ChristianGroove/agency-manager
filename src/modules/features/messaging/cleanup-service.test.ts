import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    remove: vi.fn(),
    storageFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
        storage: {
            from: mocks.storageFrom,
        },
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

function messageQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function conversationsByLeadQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        in: vi.fn(() => query),
        eq: vi.fn(() => query),
    }
    query.then = (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject)

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.from.mockReset()
    mocks.remove.mockReset()
    mocks.storageFrom.mockReset()
})

describe('messaging cleanup service logging', () => {
    it('deletes extracted storage paths without exposing path or conversation secrets in logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        mocks.from.mockImplementation((table: string) => {
            if (table === 'messages') {
                return messageQuery({
                    data: [
                        {
                            content: {
                                url: 'https://storage.test/object/public/chat-attachments/org-secret%2Fconversation-secret-id%2Ffile-secret.png?token=token-secret',
                            },
                            metadata: null,
                        },
                        {
                            content: {},
                            metadata: {
                                mediaUrl: 'https://storage.test/object/public/chat-attachments/org-secret/from-metadata-secret.mp3?download=1',
                            },
                        },
                    ],
                    error: null,
                })
            }

            throw new Error(`Unexpected table ${table}`)
        })
        mocks.storageFrom.mockReturnValue({ remove: mocks.remove })
        mocks.remove.mockResolvedValue({
            error: {
                code: 'StorageApiError',
                message: 'remove denied for org-secret/conversation-secret-id/file-secret.png token-secret',
            },
        })

        const { MessagingCleanupService } = await import('./cleanup-service')
        await new MessagingCleanupService().deleteConversationMedia('conversation-secret-id')

        expect(mocks.remove).toHaveBeenCalledWith([
            'org-secret/conversation-secret-id/file-secret.png',
            'org-secret/from-metadata-secret.mp3',
        ])

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('org-secret')
        expect(logText).not.toContain('file-secret')
        expect(logText).not.toContain('from-metadata-secret')
        expect(logText).not.toContain('token-secret')
        expect(logText).not.toContain('remove denied')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('pathsToDeleteCount')
        expect(logText).toContain('StorageApiError')
        expect(logText).toContain('hasMessage')
    })

    it('scopes lead media cleanup conversation lookups to the provided organization', async () => {
        const conversationsQuery = conversationsByLeadQuery({
            data: [],
            error: null,
        })
        mocks.from.mockImplementation((table: string) => {
            if (table === 'conversations') return conversationsQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { MessagingCleanupService } = await import('./cleanup-service')
        await new MessagingCleanupService().deleteLeadsMedia(['lead-1', 'lead-other'], 'org-current')

        expect(conversationsQuery.select).toHaveBeenCalledWith('id')
        expect(conversationsQuery.in).toHaveBeenCalledWith('lead_id', ['lead-1', 'lead-other'])
        expect(conversationsQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.storageFrom).not.toHaveBeenCalled()
    })
})
