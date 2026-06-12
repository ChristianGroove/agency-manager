import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    engineStart: vi.fn(),
    fileLog: vi.fn(),
    isOnline: vi.fn(),
    supabaseFrom: vi.fn(),
    workflowEngineCtor: vi.fn(),
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

vi.mock('@/modules/features/messaging/business-hours', () => ({
    BusinessHoursEngine: {
        isOnline: mocks.isOnline,
    },
}))

vi.mock('./engine', () => ({
    WorkflowEngine: vi.fn(function (...args: unknown[]) {
        mocks.workflowEngineCtor(...args)
        return {
            start: mocks.engineStart,
        }
    }),
}))

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function workflowsQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function awaitableQuery(result: unknown) {
    const promise = Promise.resolve(result)
    const query: any = {
        contains: vi.fn(() => query),
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        select: vi.fn(() => query),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return query
}

function updateQuery(result: unknown = { data: null, error: null }) {
    const promise = Promise.resolve(result)
    const query: any = {
        eq: vi.fn(() => query),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return {
        update: vi.fn(() => query),
        query,
    }
}

function insertSelectSingleQuery(result: unknown) {
    const single = {
        single: vi.fn(async () => result),
    }
    const select = {
        select: vi.fn(() => single),
    }

    return {
        insert: vi.fn(() => select),
        select,
        single,
    }
}

afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.engineStart.mockReset()
    mocks.fileLog.mockReset()
    mocks.isOnline.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.workflowEngineCtor.mockReset()
})

describe('AutomationTriggerService', () => {
    it('scopes the bootstrap conversation lookup to the expected organization', async () => {
        vi.useFakeTimers()
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const conversation = singleQuery({
            data: {
                connection_id: 'connection-current',
                integration_connections: { working_hours: {} },
                is_bot_active: true,
                last_auto_reply_at: null,
                metadata: {},
                organization_id: 'org-current',
            },
            error: null,
        })
        const workflows = workflowsQuery({ data: [], error: null })

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') return conversation
            if (table === 'workflows') return workflows
            throw new Error(`Unexpected table ${table}`)
        })

        const { AutomationTriggerService } = await import('./automation-trigger.service')
        await new AutomationTriggerService().evaluateInput(
            'hola',
            'conversation-current',
            'whatsapp',
            '+571234567890',
            'lead-current',
            'connection-current',
            'message-current',
            'org-current'
        )

        expect(conversation.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(conversation.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(workflows.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.workflowEngineCtor).not.toHaveBeenCalled()
    })

    it('scopes matched workflow side effects to the conversation organization', async () => {
        vi.useFakeTimers()
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.isOnline.mockReturnValue(true)
        mocks.engineStart.mockResolvedValue(undefined)

        const workflow = {
            id: 'workflow-current',
            name: 'Keyword workflow',
            organization_id: 'org-current',
            trigger_config: { keyword: 'hola', matchType: 'contains' },
            trigger_id: 'trigger-1',
            trigger_type: 'keyword',
            definition: {
                nodes: [{ id: 'trigger-1', type: 'trigger', data: { triggerType: 'keyword' } }],
            },
        }
        const conversation = singleQuery({
            data: {
                connection_id: 'connection-current',
                integration_connections: { working_hours: {} },
                is_bot_active: true,
                last_auto_reply_at: null,
                metadata: {},
                organization_id: 'org-current',
            },
            error: null,
        })
        const workflows = workflowsQuery({ data: [workflow], error: null })
        const lead = singleQuery({
            data: { id: 'lead-current', organization_id: 'org-current' },
            error: null,
        })
        const dedupe = awaitableQuery({ count: 0, error: null })
        const conversationUpdate = updateQuery()
        const executionInsert = insertSelectSingleQuery({
            data: { id: 'execution-current' },
            error: null,
        })
        const executionComplete = updateQuery()
        let workflowExecutionCalls = 0
        let conversationCalls = 0

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                conversationCalls += 1
                return conversationCalls === 1 ? conversation : conversationUpdate
            }
            if (table === 'workflows') return workflows
            if (table === 'leads') return lead
            if (table === 'workflow_executions') {
                workflowExecutionCalls += 1
                if (workflowExecutionCalls === 1) return dedupe
                if (workflowExecutionCalls === 2) return executionInsert
                if (workflowExecutionCalls === 3) return executionComplete
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { AutomationTriggerService } = await import('./automation-trigger.service')
        await new AutomationTriggerService().evaluateInput(
            'hola equipo',
            'conversation-current',
            'whatsapp',
            '+571234567890',
            'lead-current',
            'connection-current',
            'message-current',
            'org-current'
        )

        expect(lead.eq).toHaveBeenCalledWith('id', 'lead-current')
        expect(lead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(dedupe.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(dedupe.eq).toHaveBeenCalledWith('workflow_id', 'workflow-current')
        expect(conversationUpdate.query.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(conversationUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(executionInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            workflow_id: 'workflow-current',
        }))
        expect(executionComplete.query.eq).toHaveBeenCalledWith('id', 'execution-current')
        expect(executionComplete.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.workflowEngineCtor).toHaveBeenCalledWith(
            workflow.definition,
            expect.objectContaining({
                executionId: 'execution-current',
                organization_id: 'org-current',
            })
        )
    })
})
