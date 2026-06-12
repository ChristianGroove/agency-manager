import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    fileLog: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/infrastructure/logging/services/file-logger', () => ({
    fileLogger: {
        log: mocks.fileLog,
    },
}))

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateSelectQuery(result: unknown = { data: null, error: null }) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(async () => result),
    }

    return {
        update: vi.fn(() => query),
        query,
    }
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.fileLog.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('ConversationNode', () => {
    it('scopes conversation reads and updates to the workflow organization', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const workflowLogInsert = vi.fn(async () => ({ data: null, error: null }))
        const latestConversationQuery = singleQuery({
            data: {
                metadata: { existing: true },
                is_bot_active: true,
                lead_id: 'lead-current',
                status: 'open',
            },
            error: null,
        })
        const conversationUpdate = updateSelectQuery({
            data: [{ id: 'conversation-current' }],
            error: null,
        })
        let conversationCalls = 0

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'workflow_logs') return { insert: workflowLogInsert }
            if (table === 'conversations') {
                conversationCalls += 1
                return conversationCalls === 1 ? latestConversationQuery : conversationUpdate
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { ContextManager } = await import('../context-manager')
        const { ConversationNode } = await import('./conversation-node')
        const result = await new ConversationNode(new ContextManager({
            conversation: { id: 'conversation-current' },
            executionId: 'execution-current',
            organization_id: 'org-current',
        })).execute({ actionType: 'deactivate_bot' })

        expect(result).toEqual({ success: true })
        expect(latestConversationQuery.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(latestConversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationUpdate.update).toHaveBeenCalledWith(expect.objectContaining({
            is_bot_active: false,
            waiting_since: expect.any(String),
        }))
        expect(conversationUpdate.query.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(conversationUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(workflowLogInsert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            execution_id: 'execution-current',
        }))
    })
})
