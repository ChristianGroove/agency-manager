import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.supabaseFrom,
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

function messagesInsertQuery(error: unknown = null) {
    const query: any = {
        insert: vi.fn(async () => ({ error })),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.supabaseFrom.mockReset()
})

describe('MessagingPersistence', () => {
    it('does not expose persisted outbound identifiers in production success logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const query = messagesInsertQuery()
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'messages') return query
            throw new Error(`Unexpected table ${table}`)
        })

        const { MessagingPersistence } = await import('./persistence')
        const result = await MessagingPersistence.saveOutboundMessage({
            conversationId: 'conversation-secret-id',
            content: 'hola',
            externalId: 'wamid.secret.external',
            messageId: 'message-secret-id',
            sender: 'System',
            id: 'optimistic-secret-id',
        })

        expect(result).toEqual({ success: true })
        expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'optimistic-secret-id',
            conversation_id: 'conversation-secret-id',
            external_id: 'wamid.secret.external',
            sender: 'System',
        }))

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('wamid.secret.external')
        expect(logText).not.toContain('message-secret-id')
        expect(logText).not.toContain('optimistic-secret-id')
        expect(logText).toContain('conversationIdPresent')
    })

    it('does not expose raw outbound persistence errors in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const dbError = {
            code: '23505',
            message: 'duplicate external id wamid.secret.external for conversation-secret-id',
        }
        const query = messagesInsertQuery(dbError)
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'messages') return query
            throw new Error(`Unexpected table ${table}`)
        })

        const { MessagingPersistence } = await import('./persistence')
        await expect(MessagingPersistence.saveOutboundMessage({
            conversationId: 'conversation-secret-id',
            content: 'hola',
            externalId: 'wamid.secret.external',
            sender: 'Agent',
        })).rejects.toEqual(dbError)

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('wamid.secret.external')
        expect(logText).not.toContain('duplicate external id')
        expect(logText).toContain('externalIdPresent')
        expect(logText).toContain('23505')
        expect(logText).toContain('hasMessage')
    })
})
