import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    remove: vi.fn(),
    storageFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
        storage: {
            from: mocks.storageFrom,
        },
    }))
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
})
