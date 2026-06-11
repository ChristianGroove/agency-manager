import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    deleteConversationMedia: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('./cleanup-service', () => ({
    messagingCleanupService: {
        deleteConversationMedia: mocks.deleteConversationMedia,
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

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        limit: vi.fn(() => query),
        order: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateEqQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(async () => result),
    }

    return {
        update: vi.fn(() => query),
    }
}

function limitedQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        limit: vi.fn(async () => result),
        order: vi.fn(() => query),
        select: vi.fn(() => query),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.deleteConversationMedia.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('conversation actions logging', () => {
    it('does not run media cleanup for unauthenticated deletes', async () => {
        const from = vi.fn()
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: null } })),
            },
            from,
        })

        const { deleteConversation } = await import('./conversation-actions')
        const result = await deleteConversation('conversation-1')

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(from).not.toHaveBeenCalled()
        expect(mocks.deleteConversationMedia).not.toHaveBeenCalled()
    })

    it('does not expose archive database errors in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const from = vi.fn()
            .mockReturnValueOnce(singleQuery({
                data: { organization_id: 'org-secret-id' },
                error: null,
            }))
            .mockReturnValueOnce(updateEqQuery({
                error: {
                    code: '42501',
                    message: 'policy denied conversation-secret-id for org-secret-id',
                },
            }))
        mocks.createClient.mockResolvedValue({ from })

        const { archiveConversation } = await import('./conversation-actions')
        const result = await archiveConversation('conversation-secret-id')

        expect(result).toEqual({ success: false, error: 'Conversation action failed' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('policy denied')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('42501')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose lead preview message fetch failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const from = vi.fn()
            .mockReturnValueOnce(singleQuery({
                data: { id: 'conversation-secret-id' },
                error: null,
            }))
            .mockReturnValueOnce(limitedQuery({
                data: null,
                error: {
                    code: '42501',
                    message: 'messages denied lead-secret-id conversation-secret-id',
                },
            }))
        mocks.createClient.mockResolvedValue({ from })

        const { getLeadConversationPreview } = await import('./conversation-actions')
        const result = await getLeadConversationPreview('lead-secret-id')

        expect(result).toEqual({ success: false, error: 'Conversation action failed' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('messages denied')
        expect(logText).toContain('leadIdPresent')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('42501')
    })
})
